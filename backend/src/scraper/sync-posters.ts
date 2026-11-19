import { pool } from "../db.ts";
import { exigirApiKey, obtenerPosterLimpio } from "./tmdb/index.ts";

interface PeliculaSinPosterLimpio {
    id: number;
    titulo: string;
    tmdb_id: number;
}

/**
 * Busca pósters verticales sin texto (iso_639_1 = null) en TMDB
 * para películas que ya tienen tmdb_id asociado.
 */
export async function sincronizarPostersLimpios(
    options: { apply?: boolean; force?: boolean } = {},
) {
    const apply = options.apply === true;
    const force = options.force === true;
    const apiKey = exigirApiKey(process.env.TMDB_API_KEY);

    const { rows } = await pool.query<PeliculaSinPosterLimpio>(`
        SELECT id, titulo, tmdb_id
        FROM peliculas
        WHERE tmdb_id IS NOT NULL
          ${force ? "" : "AND NULLIF(BTRIM(poster_limpio), '') IS NULL"}
        ORDER BY id;
    `);

    const resumen = {
        revisadas: rows.length,
        encontradas: 0,
        actualizadas: 0,
        sinResultado: 0,
        errores: 0,
    };

    console.log(`Películas por revisar póster limpio: ${rows.length}`);

    for (const [index, pelicula] of rows.entries()) {
        try {
            const posterLimpio = await obtenerPosterLimpio(
                pelicula.tmdb_id,
                apiKey,
            );

            if (!posterLimpio) {
                resumen.sinResultado++;
                console.log(
                    `[${index + 1}/${rows.length}] ${pelicula.titulo}: sin póster sin texto en TMDB.`,
                );
                continue;
            }

            resumen.encontradas++;

            if (apply) {
                const update = await pool.query(
                    `
                        UPDATE peliculas
                        SET poster_limpio = $1
                        WHERE id = $2
                          AND poster_limpio IS DISTINCT FROM $1;
                    `,
                    [posterLimpio, pelicula.id],
                );
                resumen.actualizadas += update.rowCount ?? 0;
            }

            console.log(
                `[${index + 1}/${rows.length}] ${pelicula.titulo}: ok (${posterLimpio.split("/").pop()})`,
            );
        } catch (error) {
            resumen.errores++;
            console.error(
                `Poster #${pelicula.id}: ${error instanceof Error ? error.message : String(error)}`,
            );
        } finally {
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
    }

    console.table(resumen);
    return resumen;
}
