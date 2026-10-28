import { pool } from "../db.ts";

import { exportarDiagnosticoHtml } from "./sync-tmdb/reporte-html/index.ts";
import { evaluarPelicula } from "./sync-tmdb/evaluar-pelicula.ts";
import { indexarResoluciones } from "./sync-tmdb/resoluciones.ts";
import { crearResumenVacio } from "./sync-tmdb/resultados.ts";

import type {
    CandidatoSeguro,
    MovieRow,
    ResultadoDiagnostico,
} from "./sync-tmdb/types.ts";

function normalizarTitulo(titulo: string): string {
    return titulo
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .replace(/[\[(]\d{4}[\])]/g, "")
        .replace(/\b(4K|3D|2D|IMAX|XD)\b/g, "")
        .replace(/[^A-Z0-9]/g, "");
}
const PAUSA_ENTRE_CONSULTAS_MS = 250;

function pausa(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sincronizarMetadatosTmdb(
    options: { apply?: boolean } = {},
) {
    const apply = options.apply === true;
    const summary = crearResumenVacio();

    // Solo diagnosticar películas que todavía no tienen TMDB ID.
    const result = await pool.query<MovieRow>(`
        SELECT id, titulo, duracion, tmdb_id
        FROM peliculas
        WHERE tmdb_id IS NULL
        ORDER BY id;
    `);

    const movies = result.rows;
    const moviesById = new Map(movies.map((movie) => [movie.id, movie]));

    const { porId: resolucionesPorId, invalidas: resolucionesInvalidas } =
        indexarResoluciones(movies);

    console.log(`Películas pendientes de TMDB: ${movies.length}`);
    console.log(
        apply
            ? "MODO APPLY: se actualizarán únicamente coincidencias seguras."
            : "MODO DRY-RUN: no se modificarán datos.",
    );

    const candidatos: CandidatoSeguro[] = [];
    const resultados: ResultadoDiagnostico[] = [];

    const generarReporte = async () => {
        const reportPath = await exportarDiagnosticoHtml(
            resultados,
            summary,
            apply,
        );

        console.log("\n===== REPORTE HTML GENERADO =====");
        console.log(`Reporte ubicado en: ${reportPath}`);
    };

    for (const movie of movies) {
        const resolucion = resolucionesPorId.get(movie.id);

        const veredicto = await evaluarPelicula(
            movie,
            resolucion,
            resolucionesInvalidas.get(movie.id),
        );

        summary.revisadas++;
        summary[veredicto.contador]++;
        resultados.push(veredicto.resultado);

        if (veredicto.candidato) {
            candidatos.push(veredicto.candidato);
        }

        // Solo las búsquedas automáticas necesitan espaciarse (igual que antes).
        if (!resolucion) {
            await pausa(PAUSA_ENTRE_CONSULTAS_MS);
        }
    }
    // Los registros locales pueden compartir TMDB ID.
    // Esto es informativo y nunca provoca una fusión.
    const grupos = new Map<number, number[]>();

    for (const candidato of candidatos) {
        const grupo = grupos.get(candidato.tmdbId) ?? [];
        grupo.push(candidato.peliculaId);
        grupos.set(candidato.tmdbId, grupo);
    }

    console.log("\n===== TMDB COMPARTIDOS =====");

    for (const [tmdbId, peliculaIds] of grupos) {
        if (peliculaIds.length > 1) {
            console.log(
                `TMDB ${tmdbId}: películas locales ${peliculaIds.join(", ")}. ` +
                    "Se conservarán como registros independientes.",
            );
        }
    }
    const tmdbIds = [...new Set(candidatos.map((c) => c.tmdbId))];

    const existentes =
        tmdbIds.length > 0
            ? await pool.query<{
                  id: number;
                  titulo: string;
                  tmdb_id: number;
              }>(
                  `
              SELECT id, titulo, tmdb_id
              FROM peliculas
              WHERE tmdb_id = ANY($1::int[]);
              `,
                  [tmdbIds],
              )
            : { rows: [] };

    const conflictos = new Set<number>();

    for (const [tmdbId, candidatosMismoTmdb] of grupos) {
        if (candidatosMismoTmdb.length < 2) continue;

        const peliculasDelGrupo = candidatosMismoTmdb
            .map((peliculaId) => moviesById.get(peliculaId))
            .filter((movie): movie is MovieRow => Boolean(movie));

        for (let i = 0; i < peliculasDelGrupo.length; i++) {
            for (let j = i + 1; j < peliculasDelGrupo.length; j++) {
                const a = peliculasDelGrupo[i]!;
                const b = peliculasDelGrupo[j]!;

                if (normalizarTitulo(a.titulo) !== normalizarTitulo(b.titulo)) {
                    conflictos.add(a.id);
                    conflictos.add(b.id);

                    console.warn(
                        `Conflicto entre candidatos para TMDB ${tmdbId}: ` +
                            `"${a.titulo}" (ID ${a.id}) y "${b.titulo}" (ID ${b.id}).`,
                    );
                }
            }
        }
    }

    for (const existente of existentes.rows) {
        const candidatosMismoTmdb = candidatos.filter(
            (c) => c.tmdbId === existente.tmdb_id,
        );

        for (const candidato of candidatosMismoTmdb) {
            const peliculaNueva = movies.find(
                (m) => m.id === candidato.peliculaId,
            );

            if (!peliculaNueva) continue;

            const tituloExistente = normalizarTitulo(existente.titulo);
            const tituloNuevo = normalizarTitulo(peliculaNueva.titulo);

            const titulosCompatibles =
                tituloExistente.length > 0 &&
                tituloNuevo.length > 0 &&
                tituloExistente === tituloNuevo;

            if (!titulosCompatibles) {
                conflictos.add(candidato.peliculaId);

                console.warn(
                    `Conflicto TMDB ${existente.tmdb_id}: ` +
                        `"${peliculaNueva.titulo}" (ID ${peliculaNueva.id}) ` +
                        `frente a "${existente.titulo}" (ID ${existente.id})`,
                );
            }
        }
    }

    const candidatosAplicables = candidatos.filter((c) => {
        if (conflictos.has(c.peliculaId)) {
            summary.omitidasPorConflicto++;
            return false;
        }

        return true;
    });

    summary.segurasAplicables = candidatosAplicables.length;

    for (const resultado of resultados) {
        if (conflictos.has(resultado.peliculaId)) {
            const eraManual = resultado.estado === "ASIGNADO_MANUALMENTE";

            resultado.decision = "OMITIR_CONFLICTO";
            resultado.estado = eraManual ? "CONFLICTO_MANUAL" : "CONFLICTO";

            if (eraManual) {
                summary.conflictosManuales++;
            }
        }
    }

    // DRY-RUN termina aquí: no abre una transacción ni ejecuta UPDATE.
    if (!apply) {
        await generarReporte();
        console.log("\n===== RESUMEN DRY-RUN =====");
        console.table(summary);

        return { summary, resultados };
    }
    if (candidatosAplicables.length === 0) {
        console.log("No hay coincidencias seguras para aplicar.");

        await generarReporte();

        console.table(summary);
        return { summary, resultados };
    }

    // Las llamadas a TMDB ya terminaron. Ahora comienza la transacción.
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        for (const candidato of candidatosAplicables) {
            const update = await client.query(
                `
                UPDATE peliculas
                SET
                    tmdb_id = $1,
                    imagen_url = COALESCE(
                        NULLIF(BTRIM(imagen_url), ''),
                        $2
                    ),
                    banner = COALESCE(
                        NULLIF(BTRIM(banner), ''),
                        $3
                    ),
                    sinopsis = COALESCE(
                        NULLIF(BTRIM(sinopsis), ''),
                        $4
                    )
                WHERE id = $5
                  AND tmdb_id IS NULL;
                `,
                [
                    candidato.tmdbId,
                    candidato.poster ?? null,
                    candidato.banner ?? null,
                    candidato.sinopsis ?? null,
                    candidato.peliculaId,
                ],
            );

            if (update.rowCount === 1) {
                summary.aplicadas++;
            } else {
                summary.omitidasPorActualizacionConcurrente++;

                console.warn(
                    `Película ${candidato.peliculaId}: no se actualizó. ` +
                        "El registro pudo haber sido modificado por otro proceso.",
                );
            }
        }

        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }

    await generarReporte();

    console.log("\n===== RESUMEN APPLY =====");
    console.table(summary);

    return { summary, resultados };
}
