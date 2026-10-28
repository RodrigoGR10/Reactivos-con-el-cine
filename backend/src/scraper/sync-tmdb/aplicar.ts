import { pool } from "../../db.ts";
import type { CandidatoSeguro } from "./types.ts";

export interface ResultadoAplicacion {
    aplicadas: number;
    omitidasPorActualizacionConcurrente: number;
}

// Solo completa campos vacíos y solo si la película sigue sin tmdb_id.
const SQL_ACTUALIZAR_PELICULA = `
    UPDATE peliculas
    SET
        tmdb_id = $1,
        imagen_url = COALESCE(NULLIF(BTRIM(imagen_url), ''), $2),
        banner = COALESCE(NULLIF(BTRIM(banner), ''), $3),
        sinopsis = COALESCE(NULLIF(BTRIM(sinopsis), ''), $4)
    WHERE id = $5
      AND tmdb_id IS NULL;
`;

// Las llamadas a TMDB ya terminaron: aquí comienza la transacción.
export async function aplicarCandidatos(
    candidatos: CandidatoSeguro[],
): Promise<ResultadoAplicacion> {
    const resultado: ResultadoAplicacion = {
        aplicadas: 0,
        omitidasPorActualizacionConcurrente: 0,
    };

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        for (const candidato of candidatos) {
            const update = await client.query(SQL_ACTUALIZAR_PELICULA, [
                candidato.tmdbId,
                candidato.poster ?? null,
                candidato.banner ?? null,
                candidato.sinopsis ?? null,
                candidato.peliculaId,
            ]);

            if (update.rowCount === 1) {
                resultado.aplicadas++;
                continue;
            }

            resultado.omitidasPorActualizacionConcurrente++;

            console.warn(
                `Película ${candidato.peliculaId}: no se actualizó. ` +
                    "El registro pudo haber sido modificado por otro proceso.",
            );
        }

        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }

    return resultado;
}
