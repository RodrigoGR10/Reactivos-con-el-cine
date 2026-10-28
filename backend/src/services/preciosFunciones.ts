import { query } from "../db.ts";

import { consultarHorario } from "./preciosFunciones/consulta.ts";

import { CACHE_PRECIOS_MS, horarioPublico } from "./preciosFunciones/estado.ts";

import type {
    ScheduleRow,
    ScheduleWithPrices,
} from "./preciosFunciones/types.ts";

export { CACHE_PRECIOS_MS } from "./preciosFunciones/estado.ts";

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
