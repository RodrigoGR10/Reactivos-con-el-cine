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
 * Limpia sufijos promocionales de los cines (ej. "[2006]", "25° ANIVERSARIO", "BONUS", "PT2")
 * y extrae el año si viene explícito entre corchetes.
 */
export function parseMovieTitleForSearch(rawTitle: string): {
  queries: string[];
  year?: number;
} {
  const yearMatch = rawTitle.match(/\[(\d{4})\]/);
  const explicitYear = yearMatch ? Number(yearMatch[1]) : undefined;

  const cleaned = rawTitle
    .replace(/\[\d{4}\]/g, "")
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

export function areSameCatalogMovie(
  a: { titulo: string; duracion: number; tmdbId?: number },
  b: { titulo: string; duracion: number; tmdbId?: number },
): boolean {
  if (a.tmdbId && b.tmdbId) {
    return a.tmdbId === b.tmdbId;
  }

  if (Math.abs(a.duracion - b.duracion) > 10) {
    return false;
  }

  const parsedA = parseMovieTitleForSearch(a.titulo);
  const parsedB = parseMovieTitleForSearch(b.titulo);
  const keyA = normalizeTitleKey(parsedA.queries[0] ?? a.titulo);
  const keyB = normalizeTitleKey(parsedB.queries[0] ?? b.titulo);

  if (keyA && keyA === keyB) {
    return true;
  }

  const aTruncated = /:\s*$/.test(a.titulo.trim());
  const bTruncated = /:\s*$/.test(b.titulo.trim());
  if (
    aTruncated &&
    parsedB.queries[1] &&
    keyA === normalizeTitleKey(parsedB.queries[1])
  ) {
    return true;
  }
  if (
    bTruncated &&
    parsedA.queries[1] &&
    keyB === normalizeTitleKey(parsedA.queries[1])
  ) {
    return true;
  }

  return false;
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

  const response = await fetch(url);
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

  const qNorm = normalizeTitleKey(cleanQuery);
  const titleNorm = normalizeTitleKey(candidate.title || "");
  const origNorm = normalizeTitleKey(candidate.original_title || "");

  if (titleNorm === qNorm || origNorm === qNorm) {
    score += 50;
  } else if (titleNorm.includes(qNorm) || origNorm.includes(qNorm)) {
    score += 20;
  }

  if (explicitYear && releaseYear) {
    if (releaseYear === explicitYear) {
      score += 60;
    } else if (Math.abs(releaseYear - explicitYear) <= 1) {
      score += 30;
    } else {
      // Caso como "EL EXORCISTA [2000]" (reestreno año 2000 del clásico de 1973)
      score -= 10;
    }
  } else if (releaseYear) {
    // Para estrenos actuales sin año en corchetes, priorizar películas recientes (2024-2027)
    if (releaseYear >= 2024 && releaseYear <= 2027) {
      score += 35;
    }
  }

  if (candidate.backdrop_path) score += 25;
  if (candidate.poster_path) score += 15;
  if (candidate.overview && candidate.overview.trim().length > 20) score += 10;
  score += Math.min(candidate.popularity ?? 0, 20);

  return score;
}

export async function fetchTmdbMovieMetadata(
  titulo: string,
  apiKey = process.env.TMDB_API_KEY,
): Promise<TmdbEnrichment | null> {
  if (!apiKey || !apiKey.trim()) {
    return null;
  }

  const { queries, year } = parseMovieTitleForSearch(titulo);
  let bestCandidate: TmdbMovieResult | null = null;
  let bestScore = -Infinity;

  for (const query of queries) {
    const results = await searchTmdbQuery(query, apiKey.trim(), "es-MX");
    for (const item of results) {
      const score = scoreCandidate(item, queries[0]!, year);
      if (score > bestScore) {
        bestScore = score;
        bestCandidate = item;
      }
    }
    if (bestCandidate && bestScore >= 70) {
      break;
    }
  }

  if (!bestCandidate) {
    return null;
  }

  let sinopsis = bestCandidate.overview?.trim() || undefined;

  // Si en es-MX no tiene sinopsis, intentamos obtenerla en es-ES
  if (!sinopsis) {
    try {
      const detailUrl = new URL(`${TMDB_BASE_URL}/movie/${bestCandidate.id}`);
      detailUrl.searchParams.set("api_key", apiKey.trim());
      detailUrl.searchParams.set("language", "es-ES");
      const resp = await fetch(detailUrl);
      if (resp.ok) {
        const detail = (await resp.json()) as { overview?: string };
        if (detail.overview?.trim()) {
          sinopsis = detail.overview.trim();
        }
      }
    } catch {
      // Mantiene fallback del scraper si falla
    }
  }

  return {
    tmdbId: bestCandidate.id,
    poster: bestCandidate.poster_path
      ? `${TMDB_IMAGE_BASE}/w780${bestCandidate.poster_path}`
      : undefined,
    banner: bestCandidate.backdrop_path
      ? `${TMDB_IMAGE_BASE}/original${bestCandidate.backdrop_path}`
      : undefined,
    sinopsis,
  };
}
