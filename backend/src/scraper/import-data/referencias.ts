import type { PoolClient } from "pg";
import type { ScrapedSchedule } from "../types.ts";
import { sourceId } from "./identificadores.ts";

export async function resolveMovieId(
    client: PoolClient,
    schedule: ScrapedSchedule,
    movieIds: Map<string, number>,
): Promise<number> {
    const cached = movieIds.get(schedule.peliculaId);

    if (cached) {
        return cached;
    }

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

    const peliculaId = result.rows[0].pelicula_id;

    movieIds.set(schedule.peliculaId, peliculaId);

    return peliculaId;
}

export async function resolveCinemaId(
    client: PoolClient,
    schedule: ScrapedSchedule,
    cinemaIds: Map<string, string>,
): Promise<string> {
    const cached = cinemaIds.get(schedule.cineId);

    if (cached) {
        return cached;
    }

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

    const cineId = result.rows[0].id;

    cinemaIds.set(schedule.cineId, cineId);

    return cineId;
}
