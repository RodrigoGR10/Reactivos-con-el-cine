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
    duracionTmdb?: number;
    diferenciaDuracion?: number;
    segundoCandidato?: {
        tmdbId: number;
        titulo: string;
        tituloOriginal: string;
        fechaEstreno?: string;
        score: number;
        duracionTmdb?: number;
        diferenciaDuracion?: number;
    };
    poster?: string;
    banner?: string;
    sinopsis?: string;
    consultaCoincidente: string;
    coincideConsultaPrincipal: boolean;
    estado: "SEGURO" | "DUDOSO";
}

interface TmdbMovieDetail {
    runtime?: number | null;
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

async function fetchTmdbRuntime(
    movieId: number,
    apiKey: string,
): Promise<number | undefined> {
    const url = new URL(`${TMDB_BASE_URL}/movie/${movieId}`);

    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("language", "es-MX");

    const response = await fetch(url, {
        signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
        return undefined;
    }

    const detail = (await response.json()) as TmdbMovieDetail;

    return typeof detail.runtime === "number" && detail.runtime > 0
        ? detail.runtime
        : undefined;
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
    const value = titulo
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase();

    if (
        /\b(WORLD TOUR|LIVE VIEWING|LIVE IN|LIVE CONCERT|CONCERT|CONCIERTO|TOUR)\b/.test(
            value,
        ) ||
        /\b(BTS|BLACKPINK|ENHYPEN|SEVENTEEN|TXT|TOMORROW X TOGETHER)\b/.test(
            value,
        ) ||
        /\b(OZZY|BLACK SABBATH|HYBE)\b/.test(value)
    ) {
        return "CONCIERTO";
    }

    if (
        /\b(ANIVERSARIO|ANNIVERSARY)\b/.test(value) ||
        /\b\d+\s*(?:°|º)?\s*(?:ANOS|YEARS)\b/.test(value) ||
        /\b\d+(?:ST|ND|RD|TH)\s+ANNIVERSARY\b/.test(value)
    ) {
        return "ANIVERSARIO";
    }

    if (
        /\b(BONUS|INFINITY VISION|CHEERING PARTY|SPECIAL EVENT|FAN EVENT|EXPERIENCE EVENT)\b/.test(
            value,
        )
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
function isExactTitleMatch(
    candidate: TmdbMovieResult,
    cleanQuery: string,
): boolean {
    const queryNorm = normalizeTitleKey(cleanQuery);
    const titleNorm = normalizeTitleKey(candidate.title || "");
    const originalNorm = normalizeTitleKey(candidate.original_title || "");

    return (
        queryNorm.length > 0 &&
        (titleNorm === queryNorm || originalNorm === queryNorm)
    );
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

    if (!queryNorm) return -100;

    if (isExactTitleMatch(candidate, cleanQuery)) {
        score += 70;
    } else if (
        queryNorm.length >= 6 &&
        (titleNorm.includes(queryNorm) || originalNorm.includes(queryNorm))
    ) {
        score += 25;
    } else {
        score -= 30;
    }

    if (explicitYear !== undefined) {
        if (releaseYear === explicitYear) {
            score += 50;
        } else {
            score -= 100;
        }
    }

    return score;
}

export async function diagnosticarPeliculaTmdb(
    titulo: string,
    apiKey = process.env.TMDB_API_KEY,
    duracionEsperada?: number | null,
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
            matchedPrimary: boolean;
            exactPrimaryTitle: boolean;
            query: string;
        }
    >();

    for (let queryIndex = 0; queryIndex < queries.length; queryIndex++) {
        const query = queries[queryIndex]!;
        const isPrimaryQuery = queryIndex === 0;

        const results = await searchTmdbQuery(query, apiKey.trim(), "es-MX");

        for (const movie of results) {
            const exactPrimaryTitle = isExactTitleMatch(movie, queries[0]!);
            // Cada resultado se evalúa contra la consulta que realmente lo encontró.
            const score = scoreCandidate(movie, query, year);

            const previous = candidates.get(movie.id);

            if (!previous) {
                candidates.set(movie.id, {
                    movie,
                    score,
                    matchedPrimary: isPrimaryQuery,
                    exactPrimaryTitle,
                    query,
                });
                continue;
            }
            const shouldReplace =
                (isPrimaryQuery && !previous.matchedPrimary) ||
                (isPrimaryQuery === previous.matchedPrimary &&
                    score > previous.score);

            if (shouldReplace) {
                candidates.set(movie.id, {
                    movie,
                    score,
                    matchedPrimary: isPrimaryQuery,
                    exactPrimaryTitle,
                    query,
                });
            }
        }
    }

    const ranked = [...candidates.values()].sort(
        (a, b) =>
            b.score - a.score ||
            Number(b.exactPrimaryTitle) - Number(a.exactPrimaryTitle) ||
            Number(b.matchedPrimary) - Number(a.matchedPrimary),
    );

    if (ranked.length === 0) {
        return null;
    }

    const best = ranked[0]!;

    // Los candidatos que coinciden con el título completo
    // tienen prioridad sobre los que solo coinciden con el título base.
    const exactPrimaryRanked = ranked.filter(
        (candidate) => candidate.exactPrimaryTitle,
    );

    const second =
        exactPrimaryRanked.length > 1 ? exactPrimaryRanked[1] : undefined;

    const movie = best.movie;

    const duracionLocal =
        typeof duracionEsperada === "number" &&
        Number.isFinite(duracionEsperada) &&
        duracionEsperada > 0
            ? duracionEsperada
            : undefined;

    let duracionTmdb: number | undefined;
    let segundaDuracionTmdb: number | undefined;

    if (duracionLocal !== undefined) {
        const [runtimeBest, runtimeSecond] = await Promise.all([
            fetchTmdbRuntime(movie.id, apiKey.trim()).catch(() => undefined),
            second
                ? fetchTmdbRuntime(second.movie.id, apiKey.trim()).catch(
                      () => undefined,
                  )
                : Promise.resolve(undefined),
        ]);

        duracionTmdb = runtimeBest;
        segundaDuracionTmdb = runtimeSecond;
    }

    const diferenciaDuracion =
        duracionLocal !== undefined && duracionTmdb !== undefined
            ? Math.abs(duracionLocal - duracionTmdb)
            : undefined;

    const segundaDiferenciaDuracion =
        duracionLocal !== undefined && segundaDuracionTmdb !== undefined
            ? Math.abs(duracionLocal - segundaDuracionTmdb)
            : undefined;

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

    const anioCoincide =
        year === undefined ||
        (movie.release_date !== undefined &&
            Number(movie.release_date.slice(0, 4)) === year);

    const exactPrimaryMatches = ranked.filter(
        (candidate) => candidate.exactPrimaryTitle,
    );

    const uniqueExactMatch =
        best.exactPrimaryTitle &&
        exactPrimaryMatches.length === 1 &&
        exactPrimaryMatches[0]!.movie.id === best.movie.id;

    const sufficientMargin =
        second !== undefined && best.score - second.score >= 15;

    const runtimeDistinguishesCandidate =
        diferenciaDuracion !== undefined &&
        segundaDiferenciaDuracion !== undefined &&
        diferenciaDuracion <= 10 &&
        segundaDiferenciaDuracion >= 15 &&
        segundaDiferenciaDuracion - diferenciaDuracion >= 10;

    const seguro =
        best.score >= 70 &&
        best.matchedPrimary &&
        (uniqueExactMatch ||
            sufficientMargin ||
            runtimeDistinguishesCandidate) &&
        anioCoincide &&
        tipoDetectado === "DESCONOCIDO";

    return {
        tmdbId: movie.id,
        tituloTmdb: movie.title,
        tipoDetectado: detectarTipoContenido(titulo),
        tituloOriginal: movie.original_title,
        fechaEstreno: movie.release_date,
        score: best.score,
        duracionTmdb,
        diferenciaDuracion,
        consultaCoincidente: best.query,
        coincideConsultaPrincipal: best.matchedPrimary,
        segundoCandidato: second
            ? {
                  tmdbId: second.movie.id,
                  titulo: second.movie.title,
                  tituloOriginal: second.movie.original_title,
                  fechaEstreno: second.movie.release_date,
                  score: second.score,
                  duracionTmdb: segundaDuracionTmdb,
                  diferenciaDuracion: segundaDiferenciaDuracion,
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
