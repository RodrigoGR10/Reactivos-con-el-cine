import { query } from "../db.ts";
import { ensureCinemark, cinemarkData } from "../scraper/cinemark/client.ts";
import { normalizarOcupacionCinemark } from "../scraper/cinemark/normalize.ts";
import type { RawSession } from "../scraper/cinemark/types.ts";
import { vistaData } from "../scraper/vista/client.ts";
import type { Session } from "../scraper/vista/types.ts";
import { consultarButacasCineplanet } from "../scraper/cineplanet/butacas.ts";
import {
    consultarButacasCinepolis,
    consultarButacasLoteCinepolis,
} from "../scraper/cinepolis/butacas.ts";
import { consultarButacasVista } from "../scraper/vista/butacas.ts";
import { localNow } from "../utils/localNow.ts";
import { normalizarButacas, type Butacas } from "../scraper/butacas.ts";
import { CACHE_BUTACAS_MS } from "./estadoButacas.ts";
import { cargarHorario } from "./preciosFunciones/horarios.ts";
import type { ScheduleRow, ScheduleWithPrices } from "./preciosFunciones/types.ts";

interface SesionButacas {
    fecha: string;
    horario: string;
    peliculaId?: string;
    butacas?: Butacas;
}

const carteleras = new Map<
    string,
    { hasta: number; consulta: Promise<Map<string, SesionButacas>> }
>();
const consultas = new Map<string, Promise<ScheduleWithPrices | null>>();

async function carteleraButacas(
    origen: "cinemark" | "muvix" | "cinestar",
    cineId: string,
) {
    // Cinemark publica la ocupacion por cine. Vista publica disponibles para toda la cadena.
    const clave = origen === "cinemark" ? `${origen}:${cineId}` : origen;
    const anterior = carteleras.get(clave);
    if (anterior && anterior.hasta > Date.now()) return anterior.consulta;

    const consulta = (async () => {
        const resultado = new Map<string, SesionButacas>();
        if (origen === "cinemark") {
            await ensureCinemark();
            const sesiones = await cinemarkData<RawSession[]>(
                "/cinema/showtimes",
                { theater: cineId },
            );
            if (!Array.isArray(sesiones)) {
                throw new Error("Cinemark no devolvio su cartelera.");
            }
            const consultadasEn = new Date().toISOString();
            for (const sesion of sesiones) {
                if (sesion.theaterId !== cineId) continue;
                resultado.set(`${cineId}:${sesion.sessionId}`, {
                    fecha: sesion.sessionDateTime.slice(0, 10),
                    horario: sesion.sessionDateTime.slice(11, 16),
                    peliculaId: sesion.corporateId,
                    butacas: normalizarOcupacionCinemark(
                        sesion.occupation,
                        consultadasEn,
                    ),
                });
            }
        } else {
            const sesiones = await vistaData<Session>(origen, "Sessions");
            const consultadasEn = new Date().toISOString();
            for (const sesion of sesiones) {
                resultado.set(`${sesion.CinemaId}:${sesion.SessionId}`, {
                    fecha: sesion.Showtime.slice(0, 10),
                    horario: sesion.Showtime.slice(11, 16),
                    // SeatsAvailable no informa la capacidad. No se infiere de otras funciones de la sala.
                    butacas: normalizarButacas(
                        sesion.SeatsAvailable,
                        undefined,
                        consultadasEn,
                    ),
                });
            }
        }
        return resultado;
    })().catch((error: unknown) => {
        carteleras.delete(clave);
        throw error;
    });

    carteleras.set(clave, {
        hasta: Date.now() + CACHE_BUTACAS_MS,
        consulta,
    });
    return consulta;
}

function necesitaConsultarButacas(row: ScheduleRow, ahora: number): boolean {
    const actualizadasMs = row.butacas_actualizadas_en
        ? new Date(row.butacas_actualizadas_en).getTime()
        : 0;
    const errorHastaMs = row.butacas_error_hasta
        ? new Date(row.butacas_error_hasta).getTime()
        : 0;

    if (
        row.butacas_revision === row.revision &&
        actualizadasMs > ahora - CACHE_BUTACAS_MS
    ) {
        return false;
    }
    if (row.butacas_error_revision === row.revision && errorHastaMs > ahora) {
        return false;
    }
    return true;
}

async function actualizarHorario(
    row: ScheduleRow,
    precargadas?: Map<string, Butacas | undefined>,
): Promise<ScheduleWithPrices | null> {
    if (!necesitaConsultarButacas(row, Date.now())) {
        return cargarHorario(row.id);
    }

    const clave = `${row.id}:${row.revision}`;
    const pendiente = consultas.get(clave);
    if (pendiente) return pendiente;

    const cineOrigenId = row.cine_origen_id;
    const fecha = String(row.fecha).slice(0, 10);
    const horario = String(row.horario).slice(0, 5);

    const consulta = (async () => {
        try {
            let butacas: Butacas | undefined;
            if (row.origen === "cineplanet") {
                butacas = await consultarButacasCineplanet(
                    cineOrigenId,
                    row.sesion_id,
                );
            } else if (row.origen === "cinepolis") {
                butacas = precargadas?.has(row.sesion_id)
                    ? precargadas.get(row.sesion_id)
                    : await consultarButacasCinepolis(
                          cineOrigenId,
                          row.sesion_id,
                      );
            } else if (
                row.origen === "cinemark" ||
                row.origen === "muvix" ||
                row.origen === "cinestar"
            ) {
                if (row.origen !== "cinemark") {
                    butacas = await consultarButacasVista(
                        row.origen,
                        cineOrigenId,
                        row.sesion_id,
                    );
                }
                if (!butacas) {
                    const sesiones = await carteleraButacas(
                        row.origen,
                        cineOrigenId,
                    );
                    const sesion = sesiones.get(
                        `${cineOrigenId}:${row.sesion_id}`,
                    );
                    if (
                        sesion &&
                        sesion.fecha === fecha &&
                        sesion.horario === horario &&
                        (!sesion.peliculaId ||
                            !row.pelicula_origen_id ||
                            sesion.peliculaId === row.pelicula_origen_id)
                    ) {
                        butacas = sesion.butacas;
                    }
                }
            }

            const actualizadasEn = butacas?.consultadasEn ?? new Date().toISOString();
            await query(
                `
                UPDATE horarios
                SET butacas_revision = $2,
                    butacas_actualizadas_en = $3::timestamptz,
                    butacas_disponibles = $4,
                    butacas_total = $5,
                    butacas_consultadas_en = $6::timestamptz,
                    agotada = COALESCE($7, agotada),
                    butacas_error_hasta = NULL,
                    butacas_error_revision = NULL
                WHERE id = $1 AND revision = $2;
                `,
                [
                    row.id,
                    row.revision,
                    actualizadasEn,
                    butacas ? butacas.disponibles : null,
                    butacas?.total ?? null,
                    butacas ? butacas.consultadasEn : null,
                    butacas ? butacas.disponibles === 0 : null,
                ],
            );
        } catch (error) {
            console.warn(
                `No se pudieron consultar butacas de ${row.origen}, sesion ${row.sesion_id}:`,
                error instanceof Error ? error.message : "Error desconocido",
            );
            await query(
                `
                UPDATE horarios
                SET butacas_error_hasta = NOW() + INTERVAL '60 seconds',
                    butacas_error_revision = $2
                WHERE id = $1 AND revision = $2;
                `,
                [row.id, row.revision],
            );
        }
        return cargarHorario(row.id);
    })().finally(() => consultas.delete(clave));

    consultas.set(clave, consulta);
    return consulta;
}

const TAMANO_LOTE_CINEPOLIS = 3;

export async function butacasPorCine(
    peliculaId: string,
    cineId: string,
    fecha: string,
    onHorario?: (horario: ScheduleWithPrices) => void,
): Promise<ScheduleWithPrices[]> {
    const result = await query<ScheduleRow>(
        `
        SELECT h.*,
               h.fecha::text AS fecha,
               h.fecha_cartelera::text AS fecha_cartelera,
               c.origen_id AS cine_origen_id,
               c.nombre AS cine_nombre,
               c.cadena AS cine_cadena,
               c.url AS cine_url,
               pf.url AS pelicula_url_fuente,
               pf.origen_id AS pelicula_origen_id_fuente
        FROM horarios h
        INNER JOIN cines c ON c.id = h.cine_id
        LEFT JOIN pelicula_fuentes pf
          ON pf.pelicula_id = h.pelicula_id
         AND pf.origen = h.origen
         AND pf.origen_id = h.pelicula_origen_id
        WHERE h.pelicula_id = $1
          AND h.cine_id = $2
          AND h.fecha = $3
          AND (h.fecha + h.horario) >= (NOW() AT TIME ZONE 'America/Santiago')
        ORDER BY h.horario ASC;
        `,
        [Number(peliculaId), cineId, fecha],
    );

    const schedules = result.rows;
    if (!schedules.length) return [];

    if (
        schedules.some(
            (row) => !row.cine_origen_id || row.origen !== row.cine_cadena,
        )
    ) {
        throw new Error(
            "Actualiza la cartelera: la identidad del cine está incompleta.",
        );
    }

    const actualizados: Array<ScheduleWithPrices | null> = [];
    const ahora = localNow().slice(0, 16);
    const esVigente = (horario: ScheduleWithPrices | null): horario is ScheduleWithPrices =>
        horario !== null &&
        `${String(horario.fecha).slice(0, 10)}T${String(horario.horario).slice(0, 5)}` >=
            ahora;

    if (schedules[0]?.origen === "cinepolis") {
        // Procesa en lotes de 3 para emitir progreso al cliente apenas termina cada lote.
        const ahoraMs = Date.now();
        for (let i = 0; i < schedules.length; i += TAMANO_LOTE_CINEPOLIS) {
            const bloque = schedules.slice(i, i + TAMANO_LOTE_CINEPOLIS);
            const pendientes = bloque.filter((row) =>
                necesitaConsultarButacas(row, ahoraMs),
            );
            const precargadas =
                pendientes.length > 1
                    ? await consultarButacasLoteCinepolis(
                          schedules[0].cine_origen_id,
                          pendientes.map((row) => row.sesion_id),
                      )
                    : undefined;

            for (const row of bloque) {
                const resultado = await actualizarHorario(row, precargadas);
                actualizados.push(resultado);
                if (esVigente(resultado) && onHorario) onHorario(resultado);
            }
        }
    } else {
        // Limita las consultas por funcion; nunca se seleccionan entradas ni se reservan butacas.
        let indice = 0;
        await Promise.all(
            Array.from({ length: Math.min(2, schedules.length) }, async () => {
                while (indice < schedules.length) {
                    const posicion = indice++;
                    const resultado = await actualizarHorario(schedules[posicion]!);
                    actualizados[posicion] = resultado;
                    if (esVigente(resultado) && onHorario) onHorario(resultado);
                }
            }),
        );
    }

    return actualizados.filter(esVigente);
}
