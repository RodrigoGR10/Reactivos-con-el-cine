import type { DbClient } from "./types.ts";

export async function completarMetadatosCanonica(
    client: DbClient,
    canonicaId: number,
    idsDuplicados: number[],
): Promise<void> {
    await client.query(
        `
        UPDATE peliculas AS principal
        SET
            tmdb_id = COALESCE(
                principal.tmdb_id,
                (
                    SELECT duplicada.tmdb_id
                    FROM peliculas AS duplicada
                    WHERE duplicada.id = ANY($2::int[])
                      AND duplicada.tmdb_id IS NOT NULL
                    ORDER BY duplicada.id
                    LIMIT 1
                )
            ),
            sinopsis = COALESCE(
                NULLIF(BTRIM(principal.sinopsis), ''),
                (
                    SELECT NULLIF(BTRIM(duplicada.sinopsis), '')
                    FROM peliculas AS duplicada
                    WHERE duplicada.id = ANY($2::int[])
                      AND NULLIF(BTRIM(duplicada.sinopsis), '') IS NOT NULL
                    ORDER BY duplicada.id
                    LIMIT 1
                )
            ),
            duracion = COALESCE(
                principal.duracion,
                (
                    SELECT duplicada.duracion
                    FROM peliculas AS duplicada
                    WHERE duplicada.id = ANY($2::int[])
                      AND duplicada.duracion IS NOT NULL
                    ORDER BY duplicada.id
                    LIMIT 1
                )
            ),
            genero = COALESCE(
                NULLIF(BTRIM(principal.genero), ''),
                (
                    SELECT NULLIF(BTRIM(duplicada.genero), '')
                    FROM peliculas AS duplicada
                    WHERE duplicada.id = ANY($2::int[])
                      AND NULLIF(BTRIM(duplicada.genero), '') IS NOT NULL
                    ORDER BY duplicada.id
                    LIMIT 1
                )
            ),
            clasificacion = COALESCE(
                NULLIF(BTRIM(principal.clasificacion), ''),
                (
                    SELECT NULLIF(BTRIM(duplicada.clasificacion), '')
                    FROM peliculas AS duplicada
                    WHERE duplicada.id = ANY($2::int[])
                      AND NULLIF(BTRIM(duplicada.clasificacion), '') IS NOT NULL
                    ORDER BY duplicada.id
                    LIMIT 1
                )
            ),
            imagen_url = COALESCE(
                NULLIF(BTRIM(principal.imagen_url), ''),
                (
                    SELECT NULLIF(BTRIM(duplicada.imagen_url), '')
                    FROM peliculas AS duplicada
                    WHERE duplicada.id = ANY($2::int[])
                      AND NULLIF(BTRIM(duplicada.imagen_url), '') IS NOT NULL
                    ORDER BY duplicada.id
                    LIMIT 1
                )
            ),
            banner = COALESCE(
                NULLIF(BTRIM(principal.banner), ''),
                (
                    SELECT NULLIF(BTRIM(duplicada.banner), '')
                    FROM peliculas AS duplicada
                    WHERE duplicada.id = ANY($2::int[])
                      AND NULLIF(BTRIM(duplicada.banner), '') IS NOT NULL
                    ORDER BY duplicada.id
                    LIMIT 1
                )
            )
        WHERE principal.id = $1;
        `,
        [canonicaId, idsDuplicados],
    );
}
