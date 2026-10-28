import { pool } from "../db.ts";

import { sourceId } from "./import-data/identificadores.ts";
import { upsertSchedule } from "./import-data/horarios.ts";
import { upsertCinema } from "./import-data/cines.ts";
import { upsertMovie } from "./import-data/peliculas.ts";

import type { ScrapeResult, ScrapedSchedule } from "./types.ts";

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

function fechaLimite(desde: string, dias: number | null): string | null {
    if (dias === null) return null;

    const date = new Date(`${desde}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + dias);

    return date.toISOString().slice(0, 10);
}

async function resolveMovieId(
    client: Awaited<ReturnType<typeof pool.connect>>,
    schedule: ScrapedSchedule,
    movieIds: Map<string, number>,
): Promise<number> {
    const cached = movieIds.get(schedule.peliculaId);
    if (cached) return cached;

    const externalId = sourceId(schedule.peliculaId, schedule.origen);

    const result = await client.query<{ pelicula_id: number }>(
        `
        SELECT pelicula_id
        FROM pelicula_fuentes
        WHERE origen = $1 AND origen_id = $2;
        `,
        [schedule.origen, externalId],
    );

    if (!result.rows[0]) {
        throw new Error(
            `No existe la película ${schedule.peliculaId} en pelicula_fuentes.`,
        );
    }

    movieIds.set(schedule.peliculaId, result.rows[0].pelicula_id);
    return result.rows[0].pelicula_id;
}

async function resolveCinemaId(
    client: Awaited<ReturnType<typeof pool.connect>>,
    schedule: ScrapedSchedule,
    cinemaIds: Map<string, string>,
): Promise<string> {
    const cached = cinemaIds.get(schedule.cineId);
    if (cached) return cached;

    const externalId = sourceId(schedule.cineId, schedule.origen);

    const result = await client.query<{ id: string }>(
        `
        SELECT id
        FROM cines
        WHERE cadena = $1 AND origen_id = $2;
        `,
        [schedule.origen, externalId],
    );

    if (!result.rows[0]) {
        throw new Error(`No existe el cine ${schedule.cineId} en PostgreSQL.`);
    }

    cinemaIds.set(schedule.cineId, result.rows[0].id);
    return result.rows[0].id;
}

function canCleanStaleSchedules(data: ScrapeResult): boolean {
    return (
        data.meta.completo &&
        data.meta.limitePorCine === null &&
        data.meta.cinesSeleccionados > 0 &&
        data.meta.cinesProcesados === data.meta.cinesSeleccionados &&
        data.cines.length === data.meta.cinesSeleccionados &&
        data.incidencias.length === 0
    );
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

        // 4. Limpieza selectiva: solo si la extracción fue completa,
        // sin límites, y todos los cines seleccionados se procesaron.
        if (canCleanStaleSchedules(data)) {
            const cinemaDbIds = [...new Set(cinemaIds.values())];

            if (cinemaDbIds.length > 0) {
                const deleted = await client.query(
                    `
                    DELETE FROM horarios h
                    WHERE h.origen = $1
                      AND h.cine_id = ANY($2::text[])
                      AND h.fecha_cartelera >= $3::date
                      AND (
                          $4::date IS NULL
                          OR h.fecha_cartelera < $4::date
                      )
                      AND NOT (h.id = ANY($5::int[]));
                    `,
                    [
                        data.meta.origen,
                        cinemaDbIds,
                        data.meta.desde,
                        fechaLimite(data.meta.desde, data.meta.dias),
                        keptScheduleIds,
                    ],
                );

                summary.horariosEliminados = deleted.rowCount ?? 0;
                summary.limpiezaEjecutada = true;
            }
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
