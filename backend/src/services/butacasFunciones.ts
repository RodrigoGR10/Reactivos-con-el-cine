import { query } from "../db.ts";
import { localNow } from "../utils/localNow.ts";
import { actualizarHorario } from "./butacasFunciones/actualizacion.ts";
import type {
    ScheduleRow,
    ScheduleWithPrices,
} from "./preciosFunciones/types.ts";

/** Consultas de butacas simultaneas por funcion; nunca se reservan butacas. */
const CONSULTAS_SIMULTANEAS = 2;

export async function butacasPorCine(
    peliculaId: string,
    cineId: string,
    fecha: string,
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
    let indice = 0;
    await Promise.all(
        Array.from(
            { length: Math.min(CONSULTAS_SIMULTANEAS, schedules.length) },
            async () => {
                while (indice < schedules.length) {
                    const posicion = indice++;
                    actualizados[posicion] = await actualizarHorario(
                        schedules[posicion]!,
                    );
                }
            },
        ),
    );

    const ahora = localNow().slice(0, 16);
    return actualizados.filter(
        (horario): horario is ScheduleWithPrices =>
            horario !== null &&
            `${String(horario.fecha).slice(0, 10)}T${String(horario.horario).slice(0, 5)}` >=
                ahora,
    );
}
