import {
    duracionValida,
    exigirApiKey,
    extraerMetricasTmdb,
    obtenerPeliculaPorId,
    obtenerPosterLimpioSilencioso,
    urlBanner,
    urlPoster,
} from "./client.ts";
import { diagnosticarPeliculaTmdb } from "./diagnostico.ts";
import type { TmdbSearchOptions } from "./consulta.ts";
import type { TmdbEnrichment, TmdbMetadataPorId } from "./types.ts";

export async function fetchTmdbMovieMetadataById(
    tmdbId: number,
    apiKey = process.env.TMDB_API_KEY,
): Promise<TmdbMetadataPorId | null> {
    if (!Number.isSafeInteger(tmdbId) || tmdbId <= 0) {
        throw new Error(`TMDB ID inválido: ${tmdbId}`);
    }

    const clave = exigirApiKey(apiKey);
    const [movie, posterLimpio] = await Promise.all([
        obtenerPeliculaPorId(tmdbId, clave),
        obtenerPosterLimpioSilencioso(tmdbId, clave),
    ]);

    if (movie === null) return null;

    if (movie.id !== tmdbId || !movie.title?.trim()) {
        throw new Error(`Respuesta inválida de TMDB para ID ${tmdbId}`);
    }

    return {
        tmdbId: movie.id,
        tituloTmdb: movie.title,
        tituloOriginal: movie.original_title,
        fechaEstreno: movie.release_date || undefined,
        duracionTmdb: duracionValida(movie.runtime),
        poster: urlPoster(movie.poster_path),
        posterLimpio,
        banner: urlBanner(movie.backdrop_path),
        sinopsis: movie.overview?.trim() || undefined,
        ...extraerMetricasTmdb(movie),
    };
}

export async function fetchTmdbMovieMetadata(
    titulo: string,
    apiKeyOrOptions?: string | TmdbSearchOptions,
    maybeOptions?: TmdbSearchOptions,
): Promise<TmdbEnrichment | null> {
    const apiKey =
        typeof apiKeyOrOptions === "string"
            ? apiKeyOrOptions
            : process.env.TMDB_API_KEY;
    const options =
        typeof apiKeyOrOptions === "string"
            ? (maybeOptions ?? {})
            : (apiKeyOrOptions ?? {});

    const diagnostic = await diagnosticarPeliculaTmdb(
        titulo,
        apiKey,
        options.duracion,
        options.tituloOriginal,
        options.origenId,
    );

    if (!diagnostic || diagnostic.estado !== "SEGURO") {
        return null;
    }

    return {
        tmdbId: diagnostic.tmdbId,
        tituloOriginal: diagnostic.tituloOriginal,
        poster: diagnostic.poster,
        posterLimpio: diagnostic.posterLimpio,
        banner: diagnostic.banner,
        sinopsis: diagnostic.sinopsis,
        calificacionTmdb: diagnostic.calificacionTmdb,
        votosTmdb: diagnostic.votosTmdb,
        popularidadTmdb: diagnostic.popularidadTmdb,
        fechaEstrenoTmdb: diagnostic.fechaEstrenoTmdb,
    };
}
