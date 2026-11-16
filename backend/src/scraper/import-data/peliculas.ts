import type { PoolClient } from "pg";
import type { ScrapedMovie } from "../types.ts";

interface UpsertMovieResult {
    id: number;
    inserted: boolean;
}

export async function upsertMovie(
    client: PoolClient,
    pelicula: ScrapedMovie,
): Promise<UpsertMovieResult> {
    // Serializa importaciones concurrentes de la misma película de origen.
    await client.query(
        `SELECT pg_advisory_xact_lock(hashtextextended($1, 0));`,
        [`pelicula:${pelicula.origen}:${pelicula.origenId}`],
    );

    const existing = await client.query<{ pelicula_id: number }>(
        `
        SELECT pelicula_id
        FROM pelicula_fuentes
        WHERE origen = $1 AND origen_id = $2
        FOR UPDATE;
        `,
        [pelicula.origen, pelicula.origenId],
    );

    const fechaEstreno =
        typeof pelicula.fechaEstreno === "string"
            ? pelicula.fechaEstreno
            : null;

    const estadoEstreno = pelicula.estadoEstreno ?? "cartelera";

    if (existing.rows.length > 0) {
        const id = existing.rows[0].pelicula_id;

        await client.query(
            `
            UPDATE peliculas
            SET titulo = $2,
                sinopsis = $3,
                duracion = $4,
                genero = $5,
                clasificacion = $6,
                imagen_url = $7
            WHERE id = $1;
            `,
            [
                id,
                pelicula.titulo,
                pelicula.sinopsis,
                pelicula.duracion,
                pelicula.genero,
                pelicula.clasificacion,
                pelicula.poster,
            ],
        );

        await client.query(
            `
            UPDATE pelicula_fuentes
            SET url = $3,
                estado_estreno = $4,
                fecha_estreno = $5
            WHERE origen = $1 AND origen_id = $2;
            `,
            [
                pelicula.origen,
                pelicula.origenId,
                pelicula.url ?? null,
                estadoEstreno,
                fechaEstreno,
            ],
        );

        return { id, inserted: false };
    }

    const inserted = await client.query<{ id: number }>(
        `
        INSERT INTO peliculas (
            titulo, sinopsis, duracion, genero,
            clasificacion, imagen_url
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id;
        `,
        [
            pelicula.titulo,
            pelicula.sinopsis,
            pelicula.duracion,
            pelicula.genero,
            pelicula.clasificacion,
            pelicula.poster,
        ],
    );

    const id = inserted.rows[0].id;

    await client.query(
        `
        INSERT INTO pelicula_fuentes (
            origen, origen_id, pelicula_id,
            url, estado_estreno, fecha_estreno
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (origen, origen_id) DO UPDATE SET
            pelicula_id = EXCLUDED.pelicula_id,
            url = EXCLUDED.url,
            estado_estreno = EXCLUDED.estado_estreno,
            fecha_estreno = EXCLUDED.fecha_estreno;
        `,
        [
            pelicula.origen,
            pelicula.origenId,
            id,
            pelicula.url ?? null,
            estadoEstreno,
            fechaEstreno,
        ],
    );

    return { id, inserted: true };
}
