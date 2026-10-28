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
