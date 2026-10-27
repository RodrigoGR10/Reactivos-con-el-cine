import { pool } from "../db.ts";
import { diagnosticarPeliculaTmdb, detectarTipoContenido } from "./tmdb.ts";

interface MovieRow {
    id: number;
    titulo: string;
    duracion: number | null;
    tmdb_id: number | null;
}

interface DiagnosticSummary {
    revisadas: number;
    seguras: number;
    dudosas: number;
    sinCoincidencia: number;
    errores: number;
    posiblesDuplicados: number;
}

export async function sincronizarMetadatosTmdb() {
    const summary: DiagnosticSummary = {
        revisadas: 0,
        seguras: 0,
        dudosas: 0,
        sinCoincidencia: 0,
        errores: 0,
        posiblesDuplicados: 0,
    };

    const result = await pool.query<MovieRow>(`
        SELECT id, titulo, duracion, tmdb_id
        FROM peliculas
        ORDER BY id;
    `);

    const movies = result.rows;

    console.log(`Películas encontradas: ${movies.length}`);
    console.log("MODO DRY-RUN: no se modificarán datos.");

    const resultados: Array<{
        peliculaId: number;
        titulo: string;
        tmdbId: number | null;
        tituloTmdb: string | null;
        score: number | null;
        segundoCandidato: string | null;
        segundoScore: number | null;
        estado: string;
        duracion: number | null;
        fechaEstrenoTmdb: string | null;
        tipoDetectado: string;
        decision: string;
        fusionable: boolean;
    }> = [];

    for (const movie of movies) {
        summary.revisadas++;

        try {
            const diagnostic = await diagnosticarPeliculaTmdb(movie.titulo);

            if (!diagnostic) {
                summary.sinCoincidencia++;

                resultados.push({
                    peliculaId: movie.id,
                    titulo: movie.titulo,
                    tmdbId: null,
                    tituloTmdb: null,
                    score: null,
                    segundoCandidato: null,
                    segundoScore: null,
                    duracion: movie.duracion,
                    fechaEstrenoTmdb: null,
                    tipoDetectado: detectarTipoContenido(movie.titulo),
                    decision: "REVISAR",
                    fusionable: false,
                    estado: "SIN_COINCIDENCIA",
                });

                continue;
            }

            if (diagnostic.estado === "SEGURO") {
                summary.seguras++;
            } else {
                summary.dudosas++;
            }

            resultados.push({
                peliculaId: movie.id,
                titulo: movie.titulo,
                tmdbId: diagnostic.tmdbId,
                tituloTmdb: diagnostic.tituloTmdb,
                score: diagnostic.score,
                segundoCandidato: diagnostic.segundoCandidato?.titulo ?? null,
                segundoScore: diagnostic.segundoCandidato?.score ?? null,
                estado: diagnostic.estado,
                duracion: movie.duracion,
                fechaEstrenoTmdb: diagnostic.fechaEstreno ?? null,
                tipoDetectado: diagnostic.tipoDetectado,
                decision:
                    diagnostic.estado === "SEGURO" ? "CANDIDATO" : "REVISAR",
                fusionable: false,
            });
        } catch (error) {
            summary.errores++;

            console.error(
                `Error en película ${movie.id}:`,
                error instanceof Error ? error.message : error,
            );

            resultados.push({
                peliculaId: movie.id,
                titulo: movie.titulo,
                tmdbId: null,
                tituloTmdb: null,
                score: null,
                segundoCandidato: null,
                segundoScore: null,
                duracion: movie.duracion,
                fechaEstrenoTmdb: null,
                tipoDetectado: detectarTipoContenido(movie.titulo),
                decision: "ERROR",
                fusionable: false,
                estado: "ERROR",
            });
        }

        await new Promise((resolve) => setTimeout(resolve, 250));
    }

    // Detectar películas que apuntan al mismo ID de TMDB.
    const grupos = new Map<number, typeof resultados>();

    for (const resultado of resultados) {
        if (resultado.tmdbId === null) continue;

        const grupo = grupos.get(resultado.tmdbId) ?? [];
        grupo.push(resultado);
        grupos.set(resultado.tmdbId, grupo);
    }

    console.log("\n===== DIAGNÓSTICO TMDB =====");

    console.table(resultados);

    for (const [tmdbId, grupo] of grupos) {
        if (grupo.length > 1) {
            summary.posiblesDuplicados++;

            console.warn(
                `TMDB ${tmdbId}: varias películas locales apuntan al mismo registro`,
            );

            console.table(grupo);
        }
    }

    console.log("\n===== RESUMEN DRY-RUN =====");
    console.table(summary);

    return {
        summary,
        resultados,
    };
}
