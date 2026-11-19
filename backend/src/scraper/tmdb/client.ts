import dotenv from "dotenv";
import type {
    MetricasTmdb,
    TmdbImageItem,
    TmdbImagesResponse,
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

function numeroNoNegativo(valor: unknown): number | undefined {
    return typeof valor === "number" && Number.isFinite(valor) && valor >= 0
        ? valor
        : undefined;
}

function enteroNoNegativo(valor: unknown): number | undefined {
    return typeof valor === "number" && Number.isFinite(valor) && valor >= 0
        ? Math.round(valor)
        : undefined;
}

function fechaIsoValida(valor: unknown): string | undefined {
    if (typeof valor !== "string") return undefined;
    const limpia = valor.trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(limpia) ? limpia : undefined;
}

export function extraerMetricasTmdb(
    source: Pick<
        TmdbMovieResult | TmdbMovieDetail,
        "vote_average" | "vote_count" | "popularity" | "release_date"
    >,
): MetricasTmdb {
    const calificacionRaw = numeroNoNegativo(source.vote_average);
    const calificacionTmdb =
        calificacionRaw !== undefined && calificacionRaw <= 10
            ? calificacionRaw
            : undefined;
    const votosTmdb = enteroNoNegativo(source.vote_count);
    const popularidadTmdb = numeroNoNegativo(source.popularity);
    const fechaEstrenoTmdb = fechaIsoValida(source.release_date);

    return {
        ...(calificacionTmdb !== undefined ? { calificacionTmdb } : {}),
        ...(votosTmdb !== undefined ? { votosTmdb } : {}),
        ...(popularidadTmdb !== undefined ? { popularidadTmdb } : {}),
        ...(fechaEstrenoTmdb !== undefined ? { fechaEstrenoTmdb } : {}),
    };
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
    idioma = "es-MX",
): Promise<TmdbMovieDetail | null> {
    const url = construirUrl(`/movie/${tmdbId}`, apiKey, {
        language: idioma,
    });

    const response = await pedir(url);

    if (response.status === 404) return null;

    if (!response.ok) {
        throw new Error(`TMDB HTTP ${response.status} para ID ${tmdbId}`);
    }

    return (await response.json()) as TmdbMovieDetail;
}

export async function obtenerDetalleSilencioso(
    tmdbId: number,
    apiKey: string,
    idioma = "es-MX",
): Promise<TmdbMovieDetail | null> {
    try {
        return await obtenerPeliculaPorId(tmdbId, apiKey, idioma);
    } catch {
        return null;
    }
}

function esPosterVerticalLimpio(poster: TmdbImageItem): boolean {
    if (poster.iso_639_1 !== null || !poster.file_path?.trim()) return false;
    if (poster.height > 0 && poster.width > 0) {
        return poster.width / poster.height <= 0.85;
    }
    return typeof poster.aspect_ratio === "number" && poster.aspect_ratio <= 0.85;
}

function compararPostersLimpios(a: TmdbImageItem, b: TmdbImageItem): number {
    const aAltaRes = a.width >= 500 ? 1 : 0;
    const bAltaRes = b.width >= 500 ? 1 : 0;
    if (bAltaRes !== aAltaRes) return bAltaRes - aAltaRes;

    const aVotes = (a.vote_count ?? 0) > 0 ? (a.vote_average ?? 0) : 0;
    const bVotes = (b.vote_count ?? 0) > 0 ? (b.vote_average ?? 0) : 0;
    if (bVotes !== aVotes) return bVotes - aVotes;

    const aCount = a.vote_count ?? 0;
    const bCount = b.vote_count ?? 0;
    if (bCount !== aCount) return bCount - aCount;

    return b.width - a.width;
}

export function seleccionarMejorPosterLimpio(
    posters: TmdbImageItem[] | undefined,
): string | undefined {
    const candidatos = (posters ?? []).filter(esPosterVerticalLimpio);
    if (!candidatos.length) return undefined;
    candidatos.sort(compararPostersLimpios);
    return urlPoster(candidatos[0].file_path);
}

/**
 * Obtiene el mejor poster vertical sin texto (iso_639_1 = null) para la película.
 */
export async function obtenerPosterLimpio(
    tmdbId: number,
    apiKey: string,
): Promise<string | undefined> {
    const url = construirUrl(`/movie/${tmdbId}/images`, apiKey, {
        include_image_language: "null",
    });

    const response = await pedir(url);

    if (response.status === 404) return undefined;

    if (!response.ok) {
        throw new Error(`TMDB HTTP ${response.status} al obtener imágenes para ID ${tmdbId}`);
    }

    const data = (await response.json()) as TmdbImagesResponse;
    return seleccionarMejorPosterLimpio(data.posters);
}

export async function obtenerPosterLimpioSilencioso(
    tmdbId: number,
    apiKey: string,
): Promise<string | undefined> {
    try {
        return await obtenerPosterLimpio(tmdbId, apiKey);
    } catch {
        return undefined;
    }
}
