import type { PoolClient } from "pg";
import type { ScrapedSchedule } from "../types.ts";
import { sourceId } from "./identificadores.ts";

/**
 * Resuelve el identificador interno de una película a partir de su fuente.
 * @param client Cliente PostgreSQL usado para ejecutar consultas dentro de la transacción.
 * @param schedule Datos del horario o función que se procesa.
 * @param movieIds Película o datos de película que se procesan.
 */
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

/**
 * Resuelve el identificador interno de un cine a partir de su fuente.
 * @param client Cliente PostgreSQL usado para ejecutar consultas dentro de la transacción.
 * @param schedule Datos del horario o función que se procesa.
 * @param cinemaIds Cine o datos del cine que se procesan.
 */
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
