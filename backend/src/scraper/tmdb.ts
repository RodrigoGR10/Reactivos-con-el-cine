import dotenv from "dotenv";
dotenv.config();

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

export interface TmdbEnrichment {
    tmdbId: number;
    poster?: string;
    banner?: string;
    sinopsis?: string;
}

export interface TmdbMatchDiagnostic {
    tmdbId: number;
    tituloTmdb: string;
    tipoDetectado: TipoContenido;
    tituloOriginal: string;
    fechaEstreno?: string;
    score: number;
    segundoCandidato?: {
        tmdbId: number;
        titulo: string;
        fechaEstreno?: string;
        score: number;
    };
    poster?: string;
    banner?: string;
    sinopsis?: string;
    estado: "SEGURO" | "DUDOSO";
}

interface TmdbMovieResult {
    id: number;
    title: string;
    original_title: string;
    overview: string;
    poster_path: string | null;
    backdrop_path: string | null;
    release_date?: string;
    popularity?: number;
}

interface TmdbSearchResponse {
    results?: TmdbMovieResult[];
}

/**
 * Limpia sufijos promocionales de los cines (ej. "[2006]", "(1988)", "25° ANIVERSARIO", "BONUS", "PT2")
 * y extrae el año si viene explícito entre corchetes o paréntesis.
 */
export function parseMovieTitleForSearch(rawTitle: string): {
    queries: string[];
    year?: number;
} {
    const yearMatch = rawTitle.match(/[\(\[](\d{4})[\)\]]/);
    const explicitYear = yearMatch ? Number(yearMatch[1]) : undefined;

    const cleaned = rawTitle
        .replace(/[\(\[]\d{4}[\)\]]/g, "")
        .replace(/\b(4K|3D|2D|IMAX|XD)\b/gi, "")
        .replace(/\bPT\.?\s*2\b/gi, "PARTE 2")
        .replace(/\bPT\.?\s*1\b/gi, "PARTE 1")
        .replace(/:\s*\d+\s*AÑOS\b/gi, "")
        .replace(/\b\d+°?\s*ANIVERSARIO\b/gi, "")
        .replace(/\b(BONUS|REESTRENO|PRE-?ESTRENO|INFINITY VISION)\b/gi, "")
        .replace(/[:\-–]+\s*$/, "")
        .replace(/\s+/g, " ")
        .trim();

    const queries = [cleaned];

    // Si tiene subtítulo con ":" o " - ", agregamos el título base como segunda opción de búsqueda
    const separatorMatch = cleaned.split(/\s*:\s*|\s+[-–]\s+/);
    if (separatorMatch.length > 1 && separatorMatch[0]!.trim().length >= 3) {
        const baseTitle = separatorMatch[0]!.trim();
        if (!queries.includes(baseTitle)) {
            queries.push(baseTitle);
        }
    }

    return { queries, year: explicitYear };
}

function normalizeTitleKey(value: string): string {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");
}

export type TipoContenido =
    "PELICULA" | "ANIVERSARIO" | "CONCIERTO" | "EVENTO" | "DESCONOCIDO";

export function detectarTipoContenido(titulo: string): TipoContenido {
    const value = titulo.toUpperCase();

    if (
        /\b(WORLD TOUR|LIVE VIEWING|LIVE IN|CONCERT|CONCIERTO|TOUR)\b/.test(
            value,
        ) ||
        /\b(BTS|BLACKPINK|ENHYPEN|SEVENTEEN|TXT|TOMORROW X TOGETHER)\b/.test(
            value,
        )
    ) {
        return "CONCIERTO";
    }

    if (/\b(ANIVERSARIO|ANNIVERSARY|25°|20°)\b/.test(value)) {
        return "ANIVERSARIO";
    }

    if (
        /\b(BONUS|INFINITY VISION|CHEERING PARTY|SPECIAL EVENT)\b/.test(value)
    ) {
        return "EVENTO";
    }

    return "DESCONOCIDO";
}

export function areSameCatalogMovie(
    a: { titulo: string; duracion: number; tmdbId?: number },
    b: { titulo: string; duracion: number; tmdbId?: number },
): boolean {
    // Un mismo ID externo no basta para fusionar:
    // primero comprobamos el título y la duración.
    if (a.tmdbId && b.tmdbId && a.tmdbId !== b.tmdbId) {
        return false;
    }

    if (Math.abs(a.duracion - b.duracion) > 10) {
        return false;
    }

    const tipoA = detectarTipoContenido(a.titulo);
    const tipoB = detectarTipoContenido(b.titulo);

    // No fusionar eventos o aniversarios con películas normales.
    if (tipoA !== "DESCONOCIDO" || tipoB !== "DESCONOCIDO") {
        return false;
    }

    const parsedA = parseMovieTitleForSearch(a.titulo);
    const parsedB = parseMovieTitleForSearch(b.titulo);

    const keyA = normalizeTitleKey(parsedA.queries[0] ?? a.titulo);
    const keyB = normalizeTitleKey(parsedB.queries[0] ?? b.titulo);

    return keyA.length > 0 && keyA === keyB;
}

async function searchTmdbQuery(
    query: string,
    apiKey: string,
    language = "es-MX",
): Promise<TmdbMovieResult[]> {
    const url = new URL(`${TMDB_BASE_URL}/search/movie`);

    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("query", query);
    url.searchParams.set("language", language);
    url.searchParams.set("include_adult", "false");

    const response = await fetch(url, {
        signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
        throw new Error(`TMDB HTTP ${response.status} al buscar "${query}"`);
    }

    const data = (await response.json()) as TmdbSearchResponse;

    return Array.isArray(data.results) ? data.results : [];
}

function scoreCandidate(
    candidate: TmdbMovieResult,
    cleanQuery: string,
    explicitYear?: number,
): number {
    let score = 0;

    const releaseYear = candidate.release_date
        ? Number(candidate.release_date.slice(0, 4))
        : undefined;

    const queryNorm = normalizeTitleKey(cleanQuery);
    const titleNorm = normalizeTitleKey(candidate.title || "");
    const originalNorm = normalizeTitleKey(candidate.original_title || "");

    // La identidad se basa principalmente en el título.
    if (titleNorm === queryNorm || originalNorm === queryNorm) {
        score += 70;
    } else if (
        titleNorm.includes(queryNorm) ||
        originalNorm.includes(queryNorm)
    ) {
        score += 25;
    }

    // Si el título del cine incluye un año, debe coincidir.
    if (explicitYear && releaseYear) {
        if (releaseYear === explicitYear) {
            score += 50;
        } else if (Math.abs(releaseYear - explicitYear) === 1) {
            score += 20;
        } else {
            score -= 40;
        }
    }

    // No se usa popularidad ni disponibilidad de imágenes
    // como evidencia de identidad.
    return score;
}

export async function diagnosticarPeliculaTmdb(
    titulo: string,
    apiKey = process.env.TMDB_API_KEY,
): Promise<TmdbMatchDiagnostic | null> {
    if (!apiKey?.trim()) {
        throw new Error("Falta configurar TMDB_API_KEY");
    }

    const { queries, year } = parseMovieTitleForSearch(titulo);

    const candidates = new Map<
        number,
        {
            movie: TmdbMovieResult;
            score: number;
        }
    >();

    for (const query of queries) {
        const results = await searchTmdbQuery(query, apiKey.trim(), "es-MX");

        for (const movie of results) {
            const score = Math.max(
                ...queries.map((query) => scoreCandidate(movie, query, year)),
            );
            const previous = candidates.get(movie.id);

            if (!previous || score > previous.score) {
                candidates.set(movie.id, { movie, score });
            }
        }
    }

    const ranked = [...candidates.values()].sort((a, b) => b.score - a.score);

    if (ranked.length === 0) {
        return null;
    }

    const best = ranked[0]!;
    const second = ranked[1];

    const movie = best.movie;

    let sinopsis = movie.overview?.trim() || undefined;

    if (!sinopsis) {
        try {
            const detailUrl = new URL(`${TMDB_BASE_URL}/movie/${movie.id}`);

            detailUrl.searchParams.set("api_key", apiKey.trim());
            detailUrl.searchParams.set("language", "es-ES");

            const response = await fetch(detailUrl, {
                signal: AbortSignal.timeout(15000),
            });

            if (response.ok) {
                const detail = (await response.json()) as {
                    overview?: string;
                };

                sinopsis = detail.overview?.trim() || undefined;
            }
        } catch {
            // La sinopsis es opcional.
        }
    }

    const tipoDetectado = detectarTipoContenido(titulo);

    const seguro =
        best.score >= 70 &&
        (!second || best.score - second.score >= 15) &&
        tipoDetectado === "DESCONOCIDO";
    return {
        tmdbId: movie.id,
        tituloTmdb: movie.title,
        tipoDetectado: detectarTipoContenido(titulo),
        tituloOriginal: movie.original_title,
        fechaEstreno: movie.release_date,
        score: best.score,
        segundoCandidato: second
            ? {
                  tmdbId: second.movie.id,
                  titulo: second.movie.title,
                  fechaEstreno: second.movie.release_date,
                  score: second.score,
              }
            : undefined,
        poster: movie.poster_path
            ? `${TMDB_IMAGE_BASE}/w780${movie.poster_path}`
            : undefined,
        banner: movie.backdrop_path
            ? `${TMDB_IMAGE_BASE}/original${movie.backdrop_path}`
            : undefined,
        sinopsis,
        estado: seguro ? "SEGURO" : "DUDOSO",
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
