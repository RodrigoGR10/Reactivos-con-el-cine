import {
    detectarTipoContenido,
    diagnosticarPeliculaTmdb,
    fetchTmdbMovieMetadataById,
} from "../tmdb.ts";
import type { ResolucionManual } from "../resoluciones-tmdb.ts";
import type { MovieRow } from "./types.ts";
import { crearResultado, mensajeDeError } from "./resultados.ts";
import type { Veredicto } from "./resultados.ts";

function diferenciaDuracion(
    local: number | null,
    tmdb: number | undefined,
): number | null {
    return local !== null && tmdb !== undefined ? Math.abs(local - tmdb) : null;
}

// ---------- Resolución manual ----------

function errorManual(
    movie: MovieRow,
    resolucion: ResolucionManual,
    tipoDetectado: string,
    motivo: string,
): Veredicto {
    return {
        contador: "erroresManuales",
        resultado: crearResultado(movie, {
            estado: "ERROR_MANUAL",
            decision: "REVISAR_RESOLUCION",
            tipoDetectado,
            tmdbId: resolucion.tmdbId,
            motivoManual: motivo,
        }),
    };
}

async function evaluarResolucionManual(
    movie: MovieRow,
    resolucion: ResolucionManual,
    motivoInvalido: string | undefined,
    tipoDetectado: string,
): Promise<Veredicto> {
    if (motivoInvalido) {
        return errorManual(movie, resolucion, tipoDetectado, motivoInvalido);
    }

    if (resolucion.tmdbId === null) {
        return {
            contador: "omitidasManualmente",
            resultado: crearResultado(movie, {
                estado: "OMITIDO_MANUALMENTE",
                decision: "OMITIR",
                tipoDetectado,
                motivoManual: resolucion.motivo,
            }),
        };
    }

    try {
        const metadata = await fetchTmdbMovieMetadataById(resolucion.tmdbId);

        if (!metadata) {
            throw new Error(`TMDB no encontró el ID ${resolucion.tmdbId}.`);
        }

        return {
            contador: "asignadasManualmente",
            candidato: {
                peliculaId: movie.id,
                tmdbId: metadata.tmdbId,
                poster: metadata.poster,
                banner: metadata.banner,
                sinopsis: metadata.sinopsis,
            },
            resultado: crearResultado(movie, {
                estado: "ASIGNADO_MANUALMENTE",
                decision: "APLICAR",
                tipoDetectado,
                motivoManual: resolucion.motivo,
                tmdbId: metadata.tmdbId,
                tituloTmdb: metadata.tituloTmdb,
                tituloOriginalTmdb: metadata.tituloOriginal,
                fechaEstreno: metadata.fechaEstreno ?? null,
                duracionTmdb: metadata.duracionTmdb ?? null,
                diferenciaDuracion: diferenciaDuracion(
                    movie.duracion,
                    metadata.duracionTmdb,
                ),
            }),
        };
    } catch (error) {
        return errorManual(
            movie,
            resolucion,
            tipoDetectado,
            mensajeDeError(error),
        );
    }
}

// ---------- Búsqueda automática ----------

async function evaluarAutomatico(
    movie: MovieRow,
    tipoDetectado: string,
): Promise<Veredicto> {
    const diagnostic = await diagnosticarPeliculaTmdb(
        movie.titulo,
        undefined,
        movie.duracion,
    );

    if (!diagnostic) {
        return {
            contador: "sinCoincidencia",
            resultado: crearResultado(movie, {
                estado: "SIN_COINCIDENCIA",
                decision: "REVISAR",
                tipoDetectado,
            }),
        };
    }

    const seguro =
        diagnostic.estado === "SEGURO" &&
        diagnostic.tipoDetectado === "DESCONOCIDO" &&
        tipoDetectado === "DESCONOCIDO";

    const segundo = diagnostic.segundoCandidato;

    const resultado = crearResultado(movie, {
        estado: seguro ? "SEGURO" : "DUDOSO",
        decision: seguro ? "APLICAR" : "REVISAR",
        tipoDetectado,
        tmdbId: diagnostic.tmdbId,
        tituloTmdb: diagnostic.tituloTmdb,
        tituloOriginalTmdb: diagnostic.tituloOriginal,
        fechaEstreno: diagnostic.fechaEstreno ?? null,
        score: diagnostic.score,
        consultaCoincidente: diagnostic.consultaCoincidente ?? null,
        coincideConsultaPrincipal: diagnostic.coincideConsultaPrincipal ?? null,
        duracionTmdb: diagnostic.duracionTmdb ?? null,
        diferenciaDuracion: diagnostic.diferenciaDuracion ?? null,
        segundoCandidato: segundo?.titulo ?? null,
        segundoTmdbId: segundo?.tmdbId ?? null,
        segundoTituloOriginal: segundo?.tituloOriginal ?? null,
        segundoFechaEstreno: segundo?.fechaEstreno ?? null,
        segundoScore: segundo?.score ?? null,
        segundoDuracionTmdb: segundo?.duracionTmdb ?? null,
        segundaDiferenciaDuracion: segundo?.diferenciaDuracion ?? null,
    });

    if (!seguro) {
        return { contador: "dudosas", resultado };
    }

    return {
        contador: "seguras",
        resultado,
        candidato: {
            peliculaId: movie.id,
            tmdbId: diagnostic.tmdbId,
            poster: diagnostic.poster,
            banner: diagnostic.banner,
            sinopsis: diagnostic.sinopsis,
        },
    };
}

// ---------- Punto de entrada ----------

export async function evaluarPelicula(
    movie: MovieRow,
    resolucion: ResolucionManual | undefined,
    motivoInvalido: string | undefined,
): Promise<Veredicto> {
    try {
        const tipoDetectado = detectarTipoContenido(movie.titulo);

        if (resolucion) {
            return await evaluarResolucionManual(
                movie,
                resolucion,
                motivoInvalido,
                tipoDetectado,
            );
        }

        return await evaluarAutomatico(movie, tipoDetectado);
    } catch (error) {
        console.error(`Error en película ${movie.id}:`, mensajeDeError(error));

        return {
            contador: "errores",
            resultado: crearResultado(movie, {
                estado: "ERROR",
                decision: "REVISAR",
                tipoDetectado: detectarTipoContenido(movie.titulo),
            }),
        };
    }
}
