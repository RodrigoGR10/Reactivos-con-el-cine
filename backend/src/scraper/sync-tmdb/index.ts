import { pool } from "../../db.ts";
import { aplicarCandidatos } from "./aplicar.ts";
import { detectarConflictos, marcarConflictos } from "./conflictos.ts";
import { evaluarPelicula } from "./evaluar-pelicula.ts";
import { exportarDiagnosticoHtml } from "./reporte-html/index.ts";
import { indexarResoluciones } from "./resoluciones.ts";
import { crearResumenVacio } from "./resultados.ts";
import type {
    CandidatoSeguro,
    DiagnosticSummary,
    MovieRow,
    ResultadoDiagnostico,
} from "./types.ts";

const PAUSA_ENTRE_CONSULTAS_MS = 250;

function pausa(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// Solo diagnosticar películas que todavía no tienen TMDB ID.
async function cargarPeliculasPendientes(): Promise<MovieRow[]> {
    const result = await pool.query<MovieRow>(`
        SELECT
            p.id,
            p.titulo,
            p.titulo_original,
            p.duracion,
            p.tmdb_id,
            (
                SELECT pf.origen_id
                FROM pelicula_fuentes pf
                WHERE pf.pelicula_id = p.id
                ORDER BY (pf.origen = 'cinepolis') DESC, pf.origen
                LIMIT 1
            ) AS origen_id
        FROM peliculas p
        WHERE p.tmdb_id IS NULL
        ORDER BY p.id;
    `);

    return result.rows;
}

async function evaluarPeliculas(
    movies: MovieRow[],
    summary: DiagnosticSummary,
): Promise<{
    candidatos: CandidatoSeguro[];
    resultados: ResultadoDiagnostico[];
}> {
    const { porId, invalidas } = indexarResoluciones(movies);

    const candidatos: CandidatoSeguro[] = [];
    const resultados: ResultadoDiagnostico[] = [];

    for (const movie of movies) {
        const resolucion = porId.get(movie.id);

        const veredicto = await evaluarPelicula(
            movie,
            resolucion,
            invalidas.get(movie.id),
        );

        summary.revisadas++;
        summary[veredicto.contador]++;
        resultados.push(veredicto.resultado);

        if (veredicto.candidato) {
            candidatos.push(veredicto.candidato);
        }

        // Solo las búsquedas automáticas necesitan espaciarse.
        if (!resolucion) {
            await pausa(PAUSA_ENTRE_CONSULTAS_MS);
        }
    }

    return { candidatos, resultados };
}

async function publicarReporte(
    resultados: ResultadoDiagnostico[],
    summary: DiagnosticSummary,
    apply: boolean,
): Promise<void> {
    const reportPath = await exportarDiagnosticoHtml(
        resultados,
        summary,
        apply,
    );

    console.log("\n===== REPORTE HTML GENERADO =====");
    console.log(`Reporte ubicado en: ${reportPath}`);
}

/**
 * Diagnostica y sincroniza metadatos de películas desde TMDB.
 * @param options Opciones que controlan la consulta o transformación.
 * @returns Resultado de la operación, incluidos los registros procesados.
 */
export async function sincronizarMetadatosTmdb(
    options: { apply?: boolean } = {},
) {
    const apply = options.apply === true;
    const summary = crearResumenVacio();

    const movies = await cargarPeliculasPendientes();
    const moviesById = new Map(movies.map((movie) => [movie.id, movie]));

    console.log(`Películas pendientes de TMDB: ${movies.length}`);
    console.log(
        apply
            ? "MODO APPLY: se actualizarán únicamente coincidencias seguras."
            : "MODO DRY-RUN: no se modificarán datos.",
    );

    const { candidatos, resultados } = await evaluarPeliculas(movies, summary);

    const conflictos = await detectarConflictos(candidatos, moviesById);
    const aplicables = candidatos.filter(
        (candidato) => !conflictos.has(candidato.peliculaId),
    );

    summary.omitidasPorConflicto = candidatos.length - aplicables.length;
    summary.segurasAplicables = aplicables.length;
    summary.conflictosManuales = marcarConflictos(resultados, conflictos);

    // DRY-RUN termina aquí: no abre una transacción ni ejecuta UPDATE.
    if (!apply) {
        await publicarReporte(resultados, summary, apply);
        console.log("\n===== RESUMEN DRY-RUN =====");
        console.table(summary);

        return { summary, resultados };
    }

    if (aplicables.length === 0) {
        console.log("No hay coincidencias seguras para aplicar.");

        await publicarReporte(resultados, summary, apply);
        console.table(summary);

        return { summary, resultados };
    }

    const aplicacion = await aplicarCandidatos(aplicables);

    summary.aplicadas = aplicacion.aplicadas;
    summary.omitidasPorActualizacionConcurrente =
        aplicacion.omitidasPorActualizacionConcurrente;

    await publicarReporte(resultados, summary, apply);
    console.log("\n===== RESUMEN APPLY =====");
    console.table(summary);

    return { summary, resultados };
}
