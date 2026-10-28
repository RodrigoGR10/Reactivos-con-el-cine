import { pool } from "../db.ts";
import {
    fetchTmdbMovieMetadataById,
    diagnosticarPeliculaTmdb,
    detectarTipoContenido,
} from "./tmdb.ts";
import { resolucionesManuales } from "./resoluciones-tmdb.ts";
import { exportarDiagnosticoHtml } from "./sync-tmdb/reporte-html/index.ts";
import type {
    CandidatoSeguro,
    DiagnosticSummary,
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

export async function sincronizarMetadatosTmdb(
    options: { apply?: boolean } = {},
) {
    const apply = options.apply === true;

    const summary: DiagnosticSummary = {
        revisadas: 0,
        seguras: 0,
        segurasAplicables: 0,
        dudosas: 0,
        sinCoincidencia: 0,
        errores: 0,
        aplicadas: 0,
        omitidasPorConflicto: 0,
        omitidasPorActualizacionConcurrente: 0,
        asignadasManualmente: 0,
        omitidasManualmente: 0,
        conflictosManuales: 0,
        erroresManuales: 0,
    };

    // Solo diagnosticar películas que todavía no tienen TMDB ID.
    const result = await pool.query<MovieRow>(`
        SELECT id, titulo, duracion, tmdb_id
        FROM peliculas
        WHERE tmdb_id IS NULL
        ORDER BY id;
    `);

    const movies = result.rows;

    const moviesById = new Map(movies.map((movie) => [movie.id, movie]));

    const resolucionesPorId = new Map<
        number,
        (typeof resolucionesManuales)[number]
    >();
    const resolucionesInvalidas = new Map<number, string>();

    for (const resolucion of resolucionesManuales) {
        const { peliculaId, tmdbId, motivo } = resolucion;

        if (!Number.isSafeInteger(peliculaId) || peliculaId <= 0) {
            console.error(
                `Resolución manual con peliculaId inválido: ${peliculaId}`,
            );
            continue;
        }

        if (resolucionesPorId.has(peliculaId)) {
            resolucionesInvalidas.set(
                peliculaId,
                "Hay más de una resolución manual para esta película.",
            );
            continue;
        }

        resolucionesPorId.set(peliculaId, resolucion);

        if (
            !moviesById.has(peliculaId) ||
            (tmdbId !== null &&
                (!Number.isSafeInteger(tmdbId) || tmdbId <= 0)) ||
            typeof motivo !== "string" ||
            !motivo.trim()
        ) {
            resolucionesInvalidas.set(
                peliculaId,
                "La resolución manual tiene un ID inexistente o inválido, o no tiene un motivo.",
            );
        }
    }

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
        summary.revisadas++;

        try {
            const tipoDetectado = detectarTipoContenido(movie.titulo);

            const resolucion = resolucionesPorId.get(movie.id);

            if (resolucion) {
                const motivo = resolucionesInvalidas.get(movie.id);

                if (motivo) {
                    summary.erroresManuales++;

                    resultados.push({
                        peliculaId: movie.id,
                        titulo: movie.titulo,
                        tmdbId: resolucion.tmdbId,
                        tituloTmdb: null,
                        score: null,
                        duracionLocal: movie.duracion,
                        duracionTmdb: null,
                        diferenciaDuracion: null,
                        segundoDuracionTmdb: null,
                        segundoTmdbId: null,
                        segundaDiferenciaDuracion: null,
                        segundoCandidato: null,
                        segundoScore: null,
                        estado: "ERROR_MANUAL",
                        tipoDetectado: detectarTipoContenido(movie.titulo),
                        decision: "REVISAR_RESOLUCION",
                        consultaCoincidente: null,
                        coincideConsultaPrincipal: null,
                        tituloOriginalTmdb: null,
                        fechaEstreno: null,
                        segundoTituloOriginal: null,
                        segundoFechaEstreno: null,
                        motivoManual: motivo,
                    });

                    continue;
                }

                if (resolucion.tmdbId === null) {
                    summary.omitidasManualmente++;

                    resultados.push({
                        peliculaId: movie.id,
                        titulo: movie.titulo,
                        tmdbId: null,
                        tituloTmdb: null,
                        score: null,
                        duracionLocal: movie.duracion,
                        duracionTmdb: null,
                        diferenciaDuracion: null,
                        segundoDuracionTmdb: null,
                        segundoTmdbId: null,
                        segundaDiferenciaDuracion: null,
                        segundoCandidato: null,
                        segundoScore: null,
                        estado: "OMITIDO_MANUALMENTE",
                        tipoDetectado: detectarTipoContenido(movie.titulo),
                        decision: "OMITIR",
                        consultaCoincidente: null,
                        coincideConsultaPrincipal: null,
                        tituloOriginalTmdb: null,
                        fechaEstreno: null,
                        segundoTituloOriginal: null,
                        segundoFechaEstreno: null,
                        motivoManual: resolucion.motivo,
                    });

                    continue;
                }

                try {
                    const metadata = await fetchTmdbMovieMetadataById(
                        resolucion.tmdbId,
                    );

                    if (!metadata) {
                        throw new Error(
                            `TMDB no encontró el ID ${resolucion.tmdbId}.`,
                        );
                    }

                    candidatos.push({
                        peliculaId: movie.id,
                        tmdbId: metadata.tmdbId,
                        poster: metadata.poster,
                        banner: metadata.banner,
                        sinopsis: metadata.sinopsis,
                    });

                    summary.asignadasManualmente++;

                    resultados.push({
                        peliculaId: movie.id,
                        titulo: movie.titulo,
                        tmdbId: metadata.tmdbId,
                        tituloTmdb: metadata.tituloTmdb,
                        tituloOriginalTmdb: metadata.tituloOriginal,
                        fechaEstreno: metadata.fechaEstreno ?? null,
                        score: null,
                        duracionLocal: movie.duracion,
                        duracionTmdb: metadata.duracionTmdb ?? null,
                        diferenciaDuracion:
                            movie.duracion !== null &&
                            metadata.duracionTmdb !== undefined
                                ? Math.abs(
                                      movie.duracion - metadata.duracionTmdb,
                                  )
                                : null,
                        segundoDuracionTmdb: null,
                        segundoTmdbId: null,
                        segundaDiferenciaDuracion: null,
                        segundoCandidato: null,
                        segundoScore: null,
                        estado: "ASIGNADO_MANUALMENTE",
                        tipoDetectado: detectarTipoContenido(movie.titulo),
                        decision: "APLICAR",
                        consultaCoincidente: null,
                        coincideConsultaPrincipal: null,
                        segundoTituloOriginal: null,
                        segundoFechaEstreno: null,
                        motivoManual: resolucion.motivo,
                    });
                } catch (error) {
                    summary.erroresManuales++;

                    resultados.push({
                        peliculaId: movie.id,
                        titulo: movie.titulo,
                        tmdbId: resolucion.tmdbId,
                        tituloTmdb: null,
                        score: null,
                        duracionLocal: movie.duracion,
                        duracionTmdb: null,
                        diferenciaDuracion: null,
                        segundoDuracionTmdb: null,
                        segundoTmdbId: null,
                        segundaDiferenciaDuracion: null,
                        segundoCandidato: null,
                        segundoScore: null,
                        estado: "ERROR_MANUAL",
                        tipoDetectado: detectarTipoContenido(movie.titulo),
                        decision: "REVISAR_RESOLUCION",
                        consultaCoincidente: null,
                        coincideConsultaPrincipal: null,
                        tituloOriginalTmdb: null,
                        fechaEstreno: null,
                        segundoTituloOriginal: null,
                        segundoFechaEstreno: null,
                        motivoManual:
                            error instanceof Error
                                ? error.message
                                : String(error),
                    });
                }

                continue;
            }

            const diagnostic = await diagnosticarPeliculaTmdb(
                movie.titulo,
                undefined,
                movie.duracion,
            );
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
                    estado: "SIN_COINCIDENCIA",
                    tipoDetectado,
                    decision: "REVISAR",
                    consultaCoincidente: null,
                    coincideConsultaPrincipal: null,
                    tituloOriginalTmdb: null,
                    fechaEstreno: null,
                    segundoTituloOriginal: null,
                    segundoFechaEstreno: null,
                    duracionLocal: movie.duracion,
                    duracionTmdb: null,
                    diferenciaDuracion: null,
                    segundoDuracionTmdb: null,
                    segundaDiferenciaDuracion: null,
                    segundoTmdbId: null,
                });
            } else {
                const seguro =
                    diagnostic.estado === "SEGURO" &&
                    diagnostic.tipoDetectado === "DESCONOCIDO" &&
                    tipoDetectado === "DESCONOCIDO";

                if (seguro) {
                    summary.seguras++;

                    candidatos.push({
                        peliculaId: movie.id,
                        tmdbId: diagnostic.tmdbId,
                        poster: diagnostic.poster,
                        banner: diagnostic.banner,
                        sinopsis: diagnostic.sinopsis,
                    });
                } else {
                    summary.dudosas++;
                }

                resultados.push({
                    peliculaId: movie.id,
                    titulo: movie.titulo,
                    tmdbId: diagnostic.tmdbId,
                    tituloTmdb: diagnostic.tituloTmdb,
                    tituloOriginalTmdb: diagnostic.tituloOriginal,
                    fechaEstreno: diagnostic.fechaEstreno ?? null,
                    score: diagnostic.score,
                    segundoCandidato:
                        diagnostic.segundoCandidato?.titulo ?? null,
                    segundoTituloOriginal:
                        diagnostic.segundoCandidato?.tituloOriginal ?? null,
                    segundoFechaEstreno:
                        diagnostic.segundoCandidato?.fechaEstreno ?? null,
                    segundoScore: diagnostic.segundoCandidato?.score ?? null,
                    estado: seguro ? "SEGURO" : "DUDOSO",
                    tipoDetectado,
                    decision: seguro ? "APLICAR" : "REVISAR",
                    consultaCoincidente:
                        diagnostic?.consultaCoincidente ?? null,
                    coincideConsultaPrincipal:
                        diagnostic?.coincideConsultaPrincipal ?? null,
                    duracionLocal: movie.duracion,
                    duracionTmdb: diagnostic.duracionTmdb ?? null,
                    diferenciaDuracion: diagnostic.diferenciaDuracion ?? null,
                    segundoDuracionTmdb:
                        diagnostic.segundoCandidato?.duracionTmdb ?? null,
                    segundaDiferenciaDuracion:
                        diagnostic.segundoCandidato?.diferenciaDuracion ?? null,
                    segundoTmdbId: diagnostic.segundoCandidato?.tmdbId ?? null,
                });
            }
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
                estado: "ERROR",
                tipoDetectado: detectarTipoContenido(movie.titulo),
                decision: "REVISAR",
                consultaCoincidente: null,
                coincideConsultaPrincipal: null,
                tituloOriginalTmdb: null,
                fechaEstreno: null,
                segundoTituloOriginal: null,
                segundoFechaEstreno: null,
                duracionLocal: movie.duracion,
                duracionTmdb: null,
                diferenciaDuracion: null,
                segundoDuracionTmdb: null,
                segundaDiferenciaDuracion: null,
                segundoTmdbId: null,
            });
        }

        await new Promise((resolve) => setTimeout(resolve, 250));
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
