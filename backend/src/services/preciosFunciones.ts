import { query } from "../db.ts";
import { PELICULA_VISIBLE_SQL } from "./peliculas/visibilidad.ts";
import { pricesForSchedules as cinepolisPricesBatch } from "../scraper/cinepolis/prices.ts";
import { consultarHorario } from "./preciosFunciones/consulta.ts";
import { horarioPublico, isFresh } from "./preciosFunciones/estado.ts";
import { buildSchedule } from "./preciosFunciones/horarios.ts";
import type {
    ScheduleRow,
    ScheduleWithPrices,
} from "./preciosFunciones/types.ts";

export { CACHE_PRECIOS_MS } from "./preciosFunciones/estado.ts";

/**
 * Datos normalizados de una función para la cartelera común.
 */
export type HorarioPublico = ReturnType<typeof horarioPublico>;

const TAMANO_LOTE_CINEPOLIS = 3;

function necesitaConsultarPrecio(s: ScheduleRow, ahora: number): boolean {
    return (
        !s.agotada &&
        !isFresh(s, ahora) &&
        !(
            s.precios_error_revision === s.revision &&
            s.precios_error_hasta &&
            new Date(s.precios_error_hasta).getTime() > ahora
        )
    );
}

/**
 * Obtiene los precios de las funciones disponibles en un cine.
 * @param peliculaId Identificador de la película.
 * @param cineId Identificador del cine.
 * @param fecha Fecha de cartelera en el formato usado por el sistema.
 * @param onHorario Horario o datos de función que se procesan.
 */
export async function preciosPorCine(
    peliculaId: string,
    cineId: string,
    fecha: string,
    onHorario?: (horario: HorarioPublico) => void,
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
        INNER JOIN peliculas p ON p.id = h.pelicula_id
        INNER JOIN cines c ON c.id = h.cine_id
        LEFT JOIN pelicula_fuentes pf
          ON pf.pelicula_id = h.pelicula_id
         AND pf.origen = h.origen
         AND pf.origen_id = h.pelicula_origen_id
        WHERE h.pelicula_id = $1
          AND ${PELICULA_VISIBLE_SQL}
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
    const emitir = (resultado: ScheduleWithPrices | null) => {
        if (resultado && onHorario) onHorario(horarioPublico(resultado));
        return resultado;
    };

    if (schedules[0]?.origen === "cinepolis") {
        // Procesa en lotes de 3 para emitir progreso al cliente apenas termina cada lote.
        const ahora = Date.now();
        for (let i = 0; i < schedules.length; i += TAMANO_LOTE_CINEPOLIS) {
            const bloque = schedules.slice(i, i + TAMANO_LOTE_CINEPOLIS);
            const pendientes = bloque.filter((s) =>
                necesitaConsultarPrecio(s, ahora),
            );
            const precargadas =
                pendientes.length > 1
                    ? await cinepolisPricesBatch(pendientes.map(buildSchedule))
                    : undefined;

            for (const schedule of bloque) {
                updated.push(
                    emitir(
                        await consultarHorario(
                            schedule,
                            precargadas?.get(schedule.sesion_id),
                        ),
                    ),
                );
            }
        }
    } else {
        updated.push(
            ...(await Promise.all(
                schedules.map((schedule) =>
                    consultarHorario(schedule).then(emitir),
                ),
            )),
        );
    }

    return updated
        .filter((schedule): schedule is ScheduleWithPrices => schedule !== null)
        .map(horarioPublico);
}
