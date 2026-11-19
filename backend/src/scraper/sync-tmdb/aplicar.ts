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
        titulo_original = COALESCE(NULLIF(BTRIM(titulo_original), ''), $5),
        imagen_url = COALESCE(NULLIF(BTRIM(imagen_url), ''), $2),
        poster_limpio = COALESCE(NULLIF(BTRIM(poster_limpio), ''), $11),
        banner = COALESCE(NULLIF(BTRIM(banner), ''), $3),
        sinopsis = COALESCE(NULLIF(BTRIM(sinopsis), ''), $4),
        calificacion_tmdb = COALESCE(calificacion_tmdb, $6),
        votos_tmdb = COALESCE(votos_tmdb, $7),
        popularidad_tmdb = COALESCE(popularidad_tmdb, $8),
        fecha_estreno_tmdb = COALESCE(NULLIF(BTRIM(fecha_estreno_tmdb), ''), $9)
    WHERE id = $10
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
                candidato.tituloOriginal ?? null,
                candidato.calificacionTmdb ?? null,
                candidato.votosTmdb ?? null,
                candidato.popularidadTmdb ?? null,
                candidato.fechaEstrenoTmdb ?? null,
                candidato.peliculaId,
                candidato.posterLimpio ?? null,
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
