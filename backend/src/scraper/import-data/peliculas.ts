import type { PoolClient } from "pg";
import type { ScrapedMovie } from "../types.ts";
import { normalizarTrailerUrl } from "../../utils/trailer.ts";
import { normalizarClasificacion } from "../../utils/clasificaciones.ts";
import { normalizarGeneros } from "../../utils/generos.ts";
import { normalizarSinopsis } from "../../utils/sinopsis.ts";

interface UpsertMovieResult {
    id: number;
    inserted: boolean;
}

export async function upsertMovie(
    client: PoolClient,
    pelicula: ScrapedMovie,
): Promise<UpsertMovieResult> {
    const trailerUrl = normalizarTrailerUrl(pelicula.trailerUrl) ?? null;

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
    const tituloOriginal = pelicula.tituloOriginal?.trim() || null;
    const sinopsis = normalizarSinopsis(pelicula.sinopsis);
    const genero = normalizarGeneros(pelicula.genero);
    const clasificacion = normalizarClasificacion(pelicula.clasificacion);

    if (existing.rows.length > 0) {
        const id = existing.rows[0].pelicula_id;

        await client.query(`SELECT id FROM peliculas WHERE id = $1 FOR UPDATE;`, [id]);

        const metadataOwner = await client.query<{
            origen: string;
            cantidad_fuentes: number;
        }>(
            `
            SELECT origen, COUNT(*) OVER()::int AS cantidad_fuentes
            FROM pelicula_fuentes
            WHERE pelicula_id = $1
            ORDER BY CASE LOWER(origen)
                WHEN 'cinemark' THEN 0
                WHEN 'cineplanet' THEN 1
                WHEN 'muvix' THEN 2
                WHEN 'cinestar' THEN 3
                WHEN 'cinepolis' THEN 4
                ELSE 5
            END, origen_id
            LIMIT 1;
            `,
            [id],
        );
        const puedeActualizarMetadatos =
            metadataOwner.rows[0]?.origen === pelicula.origen;
        const tieneFuentesFusionadas =
            Number(metadataOwner.rows[0]?.cantidad_fuentes ?? 0) > 1;

        await client.query(
            `
            UPDATE peliculas
            SET titulo = CASE WHEN $9::boolean AND tmdb_id IS NULL THEN $2 ELSE titulo END,
                titulo_original = CASE WHEN $9::boolean THEN COALESCE($8, titulo_original) ELSE titulo_original END,
                sinopsis = CASE WHEN $9::boolean THEN $3 ELSE sinopsis END,
                duracion = CASE
                    WHEN $9::boolean AND (NOT $10::boolean OR $4::int IS NOT NULL) THEN $4::int
                    ELSE duracion
                END,
                genero = CASE WHEN $9::boolean THEN $5 ELSE genero END,
                clasificacion = CASE WHEN $9::boolean THEN $6 ELSE clasificacion END,
                imagen_url = CASE WHEN $9::boolean THEN $7 ELSE imagen_url END,
                trailer_url = COALESCE(NULLIF(BTRIM(trailer_url), ''), $11::text),
                trailer_encontrado_en = CASE
                    WHEN NULLIF(BTRIM(trailer_url), '') IS NULL AND $11::text IS NOT NULL THEN NOW()
                    ELSE trailer_encontrado_en END
            WHERE id = $1;
            `,
            [
                id,
                pelicula.titulo,
                sinopsis,
                pelicula.duracion,
                genero,
                clasificacion,
                pelicula.poster,
                tituloOriginal,
                puedeActualizarMetadatos,
                tieneFuentesFusionadas,
                trailerUrl,
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
            titulo, titulo_original, sinopsis, duracion, genero,
            clasificacion, imagen_url, trailer_url, trailer_encontrado_en
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::text,
                CASE WHEN $8::text IS NOT NULL THEN NOW() ELSE NULL END)
        RETURNING id;
        `,
        [
            pelicula.titulo,
            tituloOriginal,
            sinopsis,
            pelicula.duracion,
            genero,
            clasificacion,
            pelicula.poster,
            trailerUrl,
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
