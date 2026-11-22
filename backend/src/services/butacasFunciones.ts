import { query } from "../db.ts";
import { consultarButacasLoteCinepolis } from "../scraper/cinepolis/butacas.ts";
import { localNow } from "../utils/localNow.ts";
import {
    actualizarHorario,
    necesitaConsultarButacas,
} from "./butacasFunciones/actualizacion.ts";
import type {
    ScheduleRow,
    ScheduleWithPrices,
} from "./preciosFunciones/types.ts";

/** Consultas de butacas simultaneas por funcion; nunca se reservan butacas. */
const CONSULTAS_SIMULTANEAS = 2;
const TAMANO_LOTE_CINEPOLIS = 3;

/**
 * Obtiene el estado de butacas para las funciones de un cine.
 * @param peliculaId Identificador de la película.
 * @param cineId Identificador del cine.
 * @param fecha Fecha de cartelera en el formato usado por el sistema.
 * @param onHorario Horario o datos de función que se procesan.
 */
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
    const esVigente = (
        horario: ScheduleWithPrices | null,
    ): horario is ScheduleWithPrices =>
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
        let indice = 0;
        await Promise.all(
            Array.from(
                { length: Math.min(CONSULTAS_SIMULTANEAS, schedules.length) },
                async () => {
                    while (indice < schedules.length) {
                        const posicion = indice++;
                        const resultado = await actualizarHorario(
                            schedules[posicion]!,
                        );
                        actualizados[posicion] = resultado;
                        if (esVigente(resultado) && onHorario) {
                            onHorario(resultado);
                        }
                    }
                },
            ),
        );
    }

    return actualizados.filter(esVigente);
}
