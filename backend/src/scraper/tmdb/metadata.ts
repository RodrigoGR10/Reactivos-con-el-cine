import {
    duracionValida,
    exigirApiKey,
    obtenerPeliculaPorId,
    urlBanner,
    urlPoster,
} from "./client.ts";
import { diagnosticarPeliculaTmdb } from "./diagnostico.ts";
import type { TmdbEnrichment, TmdbMetadataPorId } from "./types.ts";

export async function fetchTmdbMovieMetadataById(
    tmdbId: number,
    apiKey = process.env.TMDB_API_KEY,
): Promise<TmdbMetadataPorId | null> {
    if (!Number.isSafeInteger(tmdbId) || tmdbId <= 0) {
        throw new Error(`TMDB ID inválido: ${tmdbId}`);
    }

    const clave = exigirApiKey(apiKey);
    const movie = await obtenerPeliculaPorId(tmdbId, clave);

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
        banner: urlBanner(movie.backdrop_path),
        sinopsis: movie.overview?.trim() || undefined,
    };
}

export async function fetchTmdbMovieMetadata(
    titulo: string,
    apiKey = process.env.TMDB_API_KEY,
): Promise<TmdbEnrichment | null> {
    const diagnostic = await diagnosticarPeliculaTmdb(titulo, apiKey);

    if (!diagnostic || diagnostic.estado !== "SEGURO") {
        return null;
    }

    return {
        tmdbId: diagnostic.tmdbId,
        poster: diagnostic.poster,
        banner: diagnostic.banner,
        sinopsis: diagnostic.sinopsis,
    };
}
