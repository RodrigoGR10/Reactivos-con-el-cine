import { randomUUID } from "node:crypto";
import { pool, query } from "../db.ts";
import { cinemarkData, ensureCinemark } from "../scraper/cinemark/client.ts";
import { normalizeSessions } from "../scraper/cinemark/normalize.ts";
import { pricesForSchedule } from "../scraper/cineplanet/normalize.ts";
import { pricesForSchedule as vistaPrices } from "../scraper/vista/normalize.ts";
import type { RawPriceGroup, RawSession } from "../scraper/cinemark/types.ts";
import type {
    Origen,
    ScrapedSchedule,
    ScrapedSession,
} from "../scraper/types.ts";

export const CACHE_PRECIOS_MS = 15 * 60_000;
const RETRY_MS = 60_000;
const LOCK_MS = 5 * 60_000;

type ScheduleRow = {
    id: number;
    origen_id: string;
    pelicula_id: number;
    cine_id: string;
    origen: Origen;
    pelicula_origen_id: string;
    pelicula_url: string | null;
    sesion_id: string;
    fecha: string;
    horario: string;
    fecha_cartelera: string;
    formato_resumen: string;
    idioma: string;
    sala: string;
    agotada: boolean;
    url_compra: string | null;
    revision: string;
    precios_revision: string | null;
    precios_consultados_en: Date | null;
    precios_error_revision: string | null;
    precios_error_hasta: Date | null;
    consulta_precios_revision: string | null;
    consulta_precios_hasta: Date | null;
    consulta_precios_token: string | null;
    cine_origen_id: string;
    cine_nombre: string;
    cine_url: string | null;
    pelicula_url_fuente: string | null;
    pelicula_origen_id_fuente: string;
};

type TarifaRow = {
    id: number;
    origen_id: string;
    tipo_entrada: string;
    formato: string;
    precio: number | null;
    cargo_servicio: number | null;
    precio_online: number;
    url_compra: string;
    extraido_en: Date;
};

type ScheduleWithPrices = ScheduleRow & {
    tarifas: TarifaRow[];
};

const consultas = new Map<string, Promise<ScheduleWithPrices | null>>();

function fechaHora(row: ScheduleRow): string {
    return `${row.fecha}T${String(row.horario).slice(0, 5)}`;
}

function isFresh(row: ScheduleRow, now = Date.now()): boolean {
    return (
        row.precios_revision === row.revision &&
        row.precios_consultados_en !== null &&
        now - new Date(row.precios_consultados_en).getTime() < CACHE_PRECIOS_MS
    );
}

function horarioPublico(row: ScheduleWithPrices) {
    const compatible =
        row.precios_revision === row.revision &&
        row.precios_consultados_en !== null;
    const fresh =
        compatible &&
        Date.now() - new Date(row.precios_consultados_en!).getTime() <
            CACHE_PRECIOS_MS;

    const tarifas = compatible ? row.tarifas : [];

    const estadoPrecio = row.agotada
        ? "agotada"
        : fresh
          ? tarifas.length
              ? "disponible"
              : "sin_tarifa"
          : row.consulta_precios_revision === row.revision &&
              row.consulta_precios_hasta !== null &&
              new Date(row.consulta_precios_hasta).getTime() > Date.now()
            ? "consultando"
            : row.precios_error_revision === row.revision &&
                row.precios_error_hasta !== null &&
                new Date(row.precios_error_hasta).getTime() > Date.now()
              ? "error"
              : tarifas.length
                ? "desactualizado"
                : "pendiente";

    return {
        id: String(row.id),
        peliculaId: String(row.pelicula_id),
        cineId: row.cine_id,
        fecha: row.fecha,
        fechaCartelera: row.fecha_cartelera,
        horario: String(row.horario).slice(0, 5),
        formatoResumen: row.formato_resumen,
        idioma: row.idioma,
        sala: row.sala,
        agotada: row.agotada,
        estadoPrecio,
        preciosConsultadosEn: compatible
            ? new Date(row.precios_consultados_en!).toISOString()
            : undefined,
        reintentarEn:
            row.precios_error_revision === row.revision &&
            row.precios_error_hasta
                ? new Date(row.precios_error_hasta).toISOString()
                : undefined,
        tarifas: tarifas.map((tarifa) => ({
            id: String(tarifa.id),
            origenId: tarifa.origen_id,
            tipoEntrada: tarifa.tipo_entrada,
            formato: tarifa.formato,
            precio: tarifa.precio === null ? undefined : Number(tarifa.precio),
            cargoServicio:
                tarifa.cargo_servicio === null
                    ? undefined
                    : Number(tarifa.cargo_servicio),
            precioOnline: Number(tarifa.precio_online),
            urlCompra:
                row.origen === "cineplanet"
                    ? tarifa.url_compra.replace(/\/entradas$/, "/asientos")
                    : tarifa.url_compra,
            extraidoEn: new Date(tarifa.extraido_en).toISOString(),
            peliculaId: String(row.pelicula_id),
            cineId: row.cine_id,
            agotada: row.agotada,
        })),
    };
}

async function cargarHorario(id: number): Promise<ScheduleWithPrices | null> {
    const result = await query<ScheduleRow>(
        `
        SELECT h.*,
               c.origen_id AS cine_origen_id,
               c.nombre AS cine_nombre,
               c.url AS cine_url,
               pf.url AS pelicula_url_fuente,
               pf.origen_id AS pelicula_origen_id_fuente
        FROM horarios h
        INNER JOIN cines c ON c.id = h.cine_id
        LEFT JOIN pelicula_fuentes pf
          ON pf.pelicula_id = h.pelicula_id
         AND pf.origen = h.origen
        WHERE h.id = $1;
        `,
        [id],
    );

    if (!result.rows[0]) return null;

    const row = result.rows[0];
    const prices = await query<TarifaRow>(
        `
        SELECT id, origen_id, tipo_entrada, formato, precio,
               cargo_servicio, precio_online, url_compra, extraido_en
        FROM tarifas
        WHERE horario_id = $1
        ORDER BY id;
        `,
        [id],
    );

    return { ...row, tarifas: prices.rows } as ScheduleWithPrices;
}

function buildSchedule(row: ScheduleRow): ScrapedSchedule {
    return {
        id: `${row.origen}:${row.origen_id}`,
        origen: row.origen,
        origenId: row.origen_id,
        extraidoEn: new Date().toISOString(),
        peliculaId: `${row.origen}:${row.pelicula_origen_id}`,
        cineId: `${row.origen}:${row.cine_origen_id}`,
        sesionId: row.sesion_id,
        fecha: row.fecha,
        fechaCartelera: row.fecha_cartelera,
        horario: String(row.horario).slice(0, 5),
        formatoResumen: row.formato_resumen,
        idioma: row.idioma,
        sala: row.sala,
        agotada: row.agotada,
        revision: row.revision,
        urlCompra: row.url_compra ?? undefined,
    };
}

async function extraerTarifas(row: ScheduleRow): Promise<ScrapedSession[]> {
    const schedule = buildSchedule(row);

    if (row.origen === "cineplanet") {
        return pricesForSchedule(schedule);
    }

    if (row.origen === "muvix" || row.origen === "cinestar") {
        return vistaPrices(row.origen, schedule);
    }

    await ensureCinemark();

    const prices = await cinemarkData<RawPriceGroup[]>("/get-prices", {
        cinemaId: row.cine_origen_id,
        sessionId: row.sesion_id,
        feature: "0",
        salesChannelToken: "WWW",
        memberId: "invited",
    });

    const raw: RawSession = {
        corporateId: row.pelicula_origen_id,
        theaterId: row.cine_origen_id,
        sessionId: row.sesion_id,
        theaterRoom: row.sala,
        sessionFormat: row.formato_resumen,
        sessionDateTime: `${row.fecha}T${String(row.horario).slice(0, 5)}:00`,
        sessionDisplayDate: row.fecha_cartelera,
        language: { name: row.idioma },
    };

    const cinemaUrl = row.cine_url;
    if (!cinemaUrl) throw new Error("El cine no tiene URL configurada.");

    const cinemaSlug = new URL(cinemaUrl).pathname
        .split("/")
        .filter(Boolean)
        .at(-1);
    if (!cinemaSlug) throw new Error("No se pudo obtener el slug del cine.");

    return normalizeSessions(
        raw,
        prices,
        {
            id: Number(row.cine_origen_id),
            name: row.cine_nombre,
            slug: cinemaSlug,
            address: "",
            city: "",
        },
        new Date().toISOString(),
        row.pelicula_url_fuente ?? undefined,
    );
}

async function consultarHorario(
    schedule: ScheduleRow,
): Promise<ScheduleWithPrices | null> {
    if (schedule.agotada || isFresh(schedule)) {
        return cargarHorario(schedule.id);
    }

    if (
        schedule.precios_error_revision === schedule.revision &&
        schedule.precios_error_hasta &&
        new Date(schedule.precios_error_hasta).getTime() > Date.now()
    ) {
        return cargarHorario(schedule.id);
    }

    const key = `${schedule.id}:${schedule.revision}`;
    const existing = consultas.get(key);
    if (existing) return existing;

    const task = (async () => {
        const token = randomUUID();

        // El UPDATE condicional es el bloqueo atómico: solo una petición
        // puede adquirir el candado para esta revisión.
        const claimed = await query(
            `
            UPDATE horarios
            SET consulta_precios_token = $3,
                consulta_precios_revision = revision,
                consulta_precios_hasta = NOW() + ($4 * INTERVAL '1 millisecond')
            WHERE id = $1
              AND revision = $2
              AND agotada = FALSE
              AND (
                    precios_revision IS DISTINCT FROM revision
                    OR precios_consultados_en IS NULL
                    OR precios_consultados_en <= NOW() - ($5 * INTERVAL '1 millisecond')
              )
              AND (
                    consulta_precios_hasta IS NULL
                    OR consulta_precios_hasta <= NOW()
                    OR consulta_precios_revision IS DISTINCT FROM revision
              )
              AND (
                    precios_error_hasta IS NULL
                    OR precios_error_hasta <= NOW()
                    OR precios_error_revision IS DISTINCT FROM revision
              )
            RETURNING id;
            `,
            [schedule.id, schedule.revision, token, LOCK_MS, CACHE_PRECIOS_MS],
        );

        if (!claimed.rowCount) return cargarHorario(schedule.id);

        try {
            const tarifas = await extraerTarifas(schedule);

            const client = await pool.connect();
            try {
                await client.query("BEGIN");

                // Bloquea la fila y verifica que la revisión no haya cambiado
                // mientras se consultaban los sitios externos.
                const current = await client.query(
                    `
                    SELECT id
                    FROM horarios
                    WHERE id = $1
                      AND revision = $2
                      AND consulta_precios_token = $3
                    FOR UPDATE;
                    `,
                    [schedule.id, schedule.revision, token],
                );

                if (current.rowCount) {
                    await client.query(
                        `DELETE FROM tarifas WHERE horario_id = $1;`,
                        [schedule.id],
                    );

                    for (const tarifa of tarifas) {
                        await client.query(
                            `
                            INSERT INTO tarifas (
                                origen_id, horario_id, tipo_entrada, formato,
                                precio, cargo_servicio, precio_online,
                                url_compra, extraido_en
                            )
                            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9);
                            `,
                            [
                                tarifa.origenId,
                                schedule.id,
                                tarifa.tipoEntrada,
                                tarifa.formato,
                                tarifa.precio ?? null,
                                tarifa.cargoServicio ?? null,
                                tarifa.precioOnline,
                                tarifa.urlCompra,
                                tarifa.extraidoEn,
                            ],
                        );
                    }

                    await client.query(
                        `
                        UPDATE horarios
                        SET precios_revision = revision,
                            precios_consultados_en = NOW(),
                            precios_error_revision = NULL,
                            precios_error_hasta = NULL
                        WHERE id = $1;
                        `,
                        [schedule.id],
                    );
                }

                await client.query("COMMIT");
            } catch (error) {
                await client.query("ROLLBACK");
                throw error;
            } finally {
                client.release();
            }
        } catch (error) {
            console.warn(
                `No se pudieron consultar precios de la sesión ${schedule.sesion_id}:`,
                error instanceof Error ? error.message : "Error desconocido",
            );

            await query(
                `
                UPDATE horarios
                SET precios_error_revision = revision,
                    precios_error_hasta = NOW() + ($3 * INTERVAL '1 millisecond')
                WHERE id = $1
                  AND revision = $2
                  AND consulta_precios_token = $4;
                `,
                [schedule.id, schedule.revision, RETRY_MS, token],
            );
        } finally {
            await query(
                `
                UPDATE horarios
                SET consulta_precios_token = NULL,
                    consulta_precios_hasta = NULL,
                    consulta_precios_revision = NULL
                WHERE id = $1
                  AND consulta_precios_token = $2;
                `,
                [schedule.id, token],
            );
        }

        return cargarHorario(schedule.id);
    })().finally(() => consultas.delete(key));

    consultas.set(key, task);
    return task;
}

export async function preciosPorCine(
    peliculaId: string,
    cineId: string,
    fecha: string,
) {
    const result = await query<ScheduleRow>(
        `
        SELECT h.*,
               c.origen_id AS cine_origen_id,
               c.nombre AS cine_nombre,
               c.url AS cine_url,
               pf.url AS pelicula_url_fuente,
               pf.origen_id AS pelicula_origen_id_fuente
        FROM horarios h
        INNER JOIN cines c ON c.id = h.cine_id
        LEFT JOIN pelicula_fuentes pf
          ON pf.pelicula_id = h.pelicula_id
         AND pf.origen = h.origen
        WHERE h.pelicula_id = $1
          AND h.cine_id = $2
          AND h.fecha = $3
          AND (h.fecha + h.horario) >= (NOW() AT TIME ZONE 'America/Santiago')
        ORDER BY h.horario ASC;
        `,
        [Number(peliculaId), cineId, fecha],
    );

    if (!result.rows.length) return [];

    const schedules = result.rows;

    if (
        schedules.some(
            (row) =>
                !row.cine_origen_id ||
                !row.pelicula_origen_id ||
                !row.cine_url ||
                !row.pelicula_origen_id_fuente ||
                (!row.pelicula_url_fuente && !row.pelicula_url),
        )
    ) {
        throw new Error(
            "Los datos del cine o película están incompletos. Actualiza la cartelera.",
        );
    }

    const updated = await Promise.all(
        schedules.map((schedule) => consultarHorario(schedule)),
    );

    return updated
        .filter((schedule): schedule is ScheduleWithPrices => schedule !== null)
        .map(horarioPublico);
}
