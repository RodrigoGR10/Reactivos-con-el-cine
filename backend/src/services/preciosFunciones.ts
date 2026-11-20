import { query } from "../db.ts";
import { pricesForSchedules as cinepolisPricesBatch } from "../scraper/cinepolis/prices.ts";
import { consultarHorario } from "./preciosFunciones/consulta.ts";
import { horarioPublico, isFresh } from "./preciosFunciones/estado.ts";
import { buildSchedule } from "./preciosFunciones/horarios.ts";
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

    const updated: (ScheduleWithPrices | null)[] = [];
    if (schedules[0]?.origen === "cinepolis") {
        // Agrupa consultas de Cinepolis en lotes GraphQL para evitar 1 request por funcion.
        const ahora = Date.now();
        const pendientes = schedules.filter(
            (s) =>
                !s.agotada &&
                !isFresh(s, ahora) &&
                !(
                    s.precios_error_revision === s.revision &&
                    s.precios_error_hasta &&
                    new Date(s.precios_error_hasta).getTime() > ahora
                ),
        );
        const precargadas =
            pendientes.length > 1
                ? await cinepolisPricesBatch(pendientes.map(buildSchedule))
                : undefined;

        for (const schedule of schedules) {
            updated.push(
                await consultarHorario(
                    schedule,
                    precargadas?.get(schedule.sesion_id),
                ),
            );
        }
    } else {
        updated.push(
            ...(await Promise.all(
                schedules.map((schedule) => consultarHorario(schedule)),
            )),
        );
    }

    return updated
        .filter((schedule): schedule is ScheduleWithPrices => schedule !== null)
        .map(horarioPublico);
}
