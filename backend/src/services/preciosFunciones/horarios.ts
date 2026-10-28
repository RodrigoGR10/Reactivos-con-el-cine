import { query } from "../../db.ts";
import type { ScheduleRow, ScheduleWithPrices, TarifaRow } from "./types.ts";
import type { ScrapedSchedule } from "../../scraper/types.ts";

export async function cargarHorario(
    id: number,
): Promise<ScheduleWithPrices | null> {
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

export function buildSchedule(row: ScheduleRow): ScrapedSchedule {
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

export async function cargarHorarios(
    peliculaId?: number,
    cineId?: string,
): Promise<ScheduleWithPrices[]> {
    const conditions: string[] = [
        "(h.fecha + h.horario) >= (NOW() AT TIME ZONE 'America/Santiago')",
        "h.agotada = FALSE",
    ];

    const params: unknown[] = [];

    if (peliculaId !== undefined) {
        params.push(peliculaId);
        conditions.push(`h.pelicula_id = $${params.length}`);
    }

    if (cineId !== undefined) {
        params.push(cineId);
        conditions.push(`h.cine_id = $${params.length}`);
    }

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
        WHERE ${conditions.join(" AND ")}
        ORDER BY (h.fecha + h.horario) ASC;
        `,
        params,
    );

    if (!result.rows.length) return [];

    const ids = result.rows.map((row) => row.id);

    const prices = await query<TarifaRow>(
        `
        SELECT id, origen_id, horario_id, tipo_entrada, formato,
               precio, cargo_servicio, precio_online, url_compra, extraido_en
        FROM tarifas
        WHERE horario_id = ANY($1::int[])
        ORDER BY id;
        `,
        [ids],
    );

    const tarifasPorHorario = new Map<number, TarifaRow[]>();

    for (const tarifa of prices.rows) {
        const tarifas = tarifasPorHorario.get(tarifa.horario_id) ?? [];
        tarifas.push(tarifa);
        tarifasPorHorario.set(tarifa.horario_id, tarifas);
    }

    return result.rows.map((row) => ({
        ...row,
        tarifas: tarifasPorHorario.get(row.id) ?? [],
    }));
}
