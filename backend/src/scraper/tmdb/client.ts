import dotenv from "dotenv";
import type {
    TmdbMovieDetail,
    TmdbMovieResult,
    TmdbSearchResponse,
} from "./types.ts";

dotenv.config();

const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p";
const TIMEOUT_MS = 15000;

export function exigirApiKey(apiKey: string | undefined): string {
    if (!apiKey?.trim()) {
        throw new Error("Falta configurar TMDB_API_KEY");
    }

    return apiKey.trim();
}

function construirUrl(
    ruta: string,
    apiKey: string,
    params: Record<string, string>,
): URL {
    const url = new URL(`${BASE_URL}${ruta}`);

    url.searchParams.set("api_key", apiKey);

    for (const [clave, valor] of Object.entries(params)) {
        url.searchParams.set(clave, valor);
    }

    return url;
}

function pedir(url: URL): Promise<Response> {
    return fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
}

export function duracionValida(
    runtime: number | null | undefined,
): number | undefined {
    return typeof runtime === "number" && runtime > 0 ? runtime : undefined;
}

export function urlPoster(ruta: string | null | undefined): string | undefined {
    return ruta ? `${IMAGE_BASE}/w780${ruta}` : undefined;
}

export function urlBanner(ruta: string | null | undefined): string | undefined {
    return ruta ? `${IMAGE_BASE}/original${ruta}` : undefined;
}

export async function buscarPeliculas(
    consulta: string,
    apiKey: string,
    idioma = "es-MX",
): Promise<TmdbMovieResult[]> {
    const url = construirUrl("/search/movie", apiKey, {
        query: consulta,
        language: idioma,
        include_adult: "false",
    });

    const response = await pedir(url);

    if (!response.ok) {
        throw new Error(`TMDB HTTP ${response.status} al buscar "${consulta}"`);
    }

    const data = (await response.json()) as TmdbSearchResponse;

    return Array.isArray(data.results) ? data.results : [];
}

export async function obtenerDuracion(
    movieId: number,
    apiKey: string,
): Promise<number | undefined> {
    const url = construirUrl(`/movie/${movieId}`, apiKey, {
        language: "es-MX",
    });

    const response = await pedir(url);

    if (!response.ok) return undefined;

    const detalle = (await response.json()) as TmdbMovieDetail;

    return duracionValida(detalle.runtime);
}

// La sinopsis es opcional: cualquier fallo devuelve undefined.
export async function obtenerSinopsisRespaldo(
    movieId: number,
    apiKey: string,
): Promise<string | undefined> {
    try {
        const url = construirUrl(`/movie/${movieId}`, apiKey, {
            language: "es-ES",
        });

        const response = await pedir(url);

        if (!response.ok) return undefined;

        const detalle = (await response.json()) as TmdbMovieDetail;

        return detalle.overview?.trim() || undefined;
    } catch {
        return undefined;
    }
}

export async function obtenerPeliculaPorId(
    tmdbId: number,
    apiKey: string,
): Promise<TmdbMovieDetail | null> {
    const url = construirUrl(`/movie/${tmdbId}`, apiKey, {
        language: "es-MX",
    });

    const response = await pedir(url);

    if (response.status === 404) return null;

    if (!response.ok) {
        throw new Error(`TMDB HTTP ${response.status} para ID ${tmdbId}`);
    }

    return (await response.json()) as TmdbMovieDetail;
}
