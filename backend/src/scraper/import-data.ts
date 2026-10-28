import { pool } from "../db.ts";

import { upsertSchedule } from "./import-data/horarios.ts";
import { upsertCinema } from "./import-data/cines.ts";
import { upsertMovie } from "./import-data/peliculas.ts";
import { resolveCinemaId, resolveMovieId } from "./import-data/referencias.ts";
import { limpiarHorariosObsoletos } from "./import-data/limpieza.ts";

import type { ScrapeResult } from "./types.ts";

interface ImportSummary {
    cines: number;
    peliculasInsertadas: number;
    peliculasActualizadas: number;
    horariosInsertados: number;
    horariosActualizados: number;
    horariosEliminados: number;
    tarifasInvalidadas: number;
    limpiezaEjecutada: boolean;
}

export async function importarDatosScraped(
    data: ScrapeResult,
): Promise<ImportSummary> {
    for (const cine of data.cines) {
        if (cine.origen !== data.meta.origen) {
            throw new Error(`El cine ${cine.id} pertenece a otro origen.`);
        }
    }

    for (const pelicula of data.peliculas) {
        if (pelicula.origen !== data.meta.origen) {
            throw new Error(
                `La película ${pelicula.id} pertenece a otro origen.`,
            );
        }
    }

    for (const horario of data.horarios) {
        if (horario.origen !== data.meta.origen) {
            throw new Error(
                `El horario ${horario.id} pertenece a otro origen.`,
            );
        }
    }

    const client = await pool.connect();

    const summary: ImportSummary = {
        cines: 0,
        peliculasInsertadas: 0,
        peliculasActualizadas: 0,
        horariosInsertados: 0,
        horariosActualizados: 0,
        horariosEliminados: 0,
        tarifasInvalidadas: 0,
        limpiezaEjecutada: false,
    };

    try {
        await client.query("BEGIN");

        const cinemaIds = new Map<string, string>();
        const movieIds = new Map<string, number>();

        // 1. Cines
        for (const cine of data.cines) {
            const id = await upsertCinema(client, cine);
            cinemaIds.set(cine.id, id);
            summary.cines++;
        }

        // 2. Películas y sus fuentes
        for (const pelicula of data.peliculas) {
            const result = await upsertMovie(client, pelicula);
            movieIds.set(pelicula.id, result.id);

            if (result.inserted) {
                summary.peliculasInsertadas++;
            } else {
                summary.peliculasActualizadas++;
            }
        }

        // 3. Horarios
        const keptScheduleIds: number[] = [];

        for (const schedule of data.horarios) {
            if (schedule.origen !== data.meta.origen) {
                throw new Error(
                    `El horario ${schedule.id} pertenece a ${schedule.origen}, no a ${data.meta.origen}.`,
                );
            }

            const peliculaId = await resolveMovieId(client, schedule, movieIds);

            const cineId = await resolveCinemaId(client, schedule, cinemaIds);

            const result = await upsertSchedule(
                client,
                schedule,
                peliculaId,
                cineId,
            );

            keptScheduleIds.push(result.id);
            summary.tarifasInvalidadas += result.invalidated;

            if (result.inserted) {
                summary.horariosInsertados++;
            } else {
                summary.horariosActualizados++;
            }
        }

        // 4. Limpieza selectiva de horarios obsoletos.
        const horariosEliminados = await limpiarHorariosObsoletos(
            client,
            data,
            cinemaIds,
            keptScheduleIds,
        );

        if (horariosEliminados !== null) {
            summary.horariosEliminados = horariosEliminados;
            summary.limpiezaEjecutada = true;
        }

        await client.query("COMMIT");

        return summary;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}
