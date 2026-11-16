import dotenv from "dotenv";
dotenv.config();

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

const STOPWORDS = new Set([
  "DE",
  "DEL",
  "AL",
  "LA",
  "EL",
  "LOS",
  "LAS",
  "UN",
  "UNA",
  "THE",
  "A",
  "AN",
  "OF",
  "EN",
  "IN",
  "TO",
  "AND",
  "Y",
]);

// Excluye I, V, X sueltos para no alterar títulos como "THE MAN I LOVE" o "TOMORROW X TOGETHER"
const NUMBER_WORDS: Record<string, string> = {
  UNO: "1",
  PRIMERO: "1",
  PRIMERA: "1",
  ONE: "1",
  DOS: "2",
  SEGUNDO: "2",
  SEGUNDA: "2",
  TWO: "2",
  II: "2",
  TRES: "3",
  TERCERO: "3",
  TERCERA: "3",
  THREE: "3",
  III: "3",
  CUATRO: "4",
  FOUR: "4",
  IV: "4",
  CINCO: "5",
  FIVE: "5",
  SEIS: "6",
  SIX: "6",
  VI: "6",
  SIETE: "7",
  SEVEN: "7",
  VII: "7",
  OCHO: "8",
  EIGHT: "8",
  VIII: "8",
  NUEVE: "9",
  NINE: "9",
  IX: "9",
  DIEZ: "10",
  TEN: "10",
};

const NUMBER_WORDS_REGEX = new RegExp(
  `\\b(${Object.keys(NUMBER_WORDS).join("|")})\\b`,
  "g",
);

const MIN_CANDIDATE_SCORE = 65;
const MIN_TITLE_SCORE = 25;
const STRONG_TITLE_SCORE = 52;
const STRONG_CANDIDATE_SCORE = 95;

export interface TmdbEnrichment {
  tmdbId: number;
  poster?: string;
  banner?: string;
  sinopsis?: string;
  calificacionTmdb?: number;
  votosTmdb?: number;
  popularidadTmdb?: number;
  fechaEstrenoTmdb?: string;
}

export interface TmdbSearchOptions {
  tituloOriginal?: string;
  duracion?: number;
  origenId?: string;
}

export interface ParsedMovieSearch {
  queries: string[];
  year?: number;
  approxYear?: number;
  isReRelease: boolean;
  canonicalTitle: string;
  isFestival: boolean;
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
  vote_average?: number;
  vote_count?: number;
}

interface TmdbMovieDetail {
  id: number;
  title?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  runtime?: number | null;
  release_date?: string;
  popularity?: number;
  vote_average?: number;
  vote_count?: number;
}

interface TmdbSearchResponse {
  results?: TmdbMovieResult[];
}

function normalizeNumberWords(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(NUMBER_WORDS_REGEX, (match) => NUMBER_WORDS[match] ?? match);
}

function normalizeTitleKey(value: string): string {
  return normalizeNumberWords(value).replace(/[^A-Z0-9]/g, "");
}

function stripLeadingArticle(value: string): string {
  return value.replace(/^(?:el|la|los|las|un|una|the|a|an)\s+/i, "").trim();
}

function extractContentTokens(value: string): string[] {
  return normalizeNumberWords(value)
    .replace(/[^A-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(
      (word) =>
        (word.length >= 2 || /^\d+$/.test(word)) && !STOPWORDS.has(word),
    );
}

function normalizeContentWords(value: string): string {
  return extractContentTokens(value).join(" ");
}

function cleanPromotionalTitle(rawTitle: string): string {
  return rawTitle
    .replace(/[\(\[]\d{4}[\)\]]/g, "")
    .replace(/\b(4K|3D|2D|IMAX|XD)\b/gi, "")
    .replace(/\bPT\.?\s*2\b/gi, "PARTE 2")
    .replace(/\bPT\.?\s*1\b/gi, "PARTE 1")
    .replace(/(?::\s*)?\b\d+\s*°?\s*(?:AÑOS|ANIVERSARIO)\b/gi, "")
    .replace(/\b(BONUS|REESTRENO|PRE-?ESTRENO|INFINITY VISION|LIVE VIEWING)\b/gi, "")
    .replace(/[:\-–]+\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isFestivalPrefix(prefix: string): boolean {
  return (
    /\b(?:FESTIVAL|CICLO|MUESTRA|TEMPORADA)\b/i.test(prefix) ||
    /^SANFIC\d*$/i.test(prefix.trim())
  );
}

function isAcronymPrefix(prefix: string): boolean {
  return /^[A-Z]{2,4}$/.test(prefix.trim());
}

function splitTitleBySeparator(title: string): {
  hasPrefix: boolean;
  left: string;
  right: string;
} {
  const parts = title.split(/\s*:\s*|\s+[-–]\s+/);
  const hasPrefix = parts.length > 1;
  return {
    hasPrefix,
    left: hasPrefix ? (parts[0] ?? "").trim() : "",
    right: hasPrefix ? parts.slice(1).join(": ").trim() : "",
  };
}

function titleFromOrigenSlug(origenId?: string): string | undefined {
  if (!origenId || !/^[a-z]+(?:-[a-z]+)+$/i.test(origenId)) {
    return undefined;
  }

  let slugTitle = cleanPromotionalTitle(origenId.replace(/-/g, " "));
  const words = slugTitle.split(/\s+/);
  if (words.length > 1 && isAcronymPrefix((words[0] ?? "").toUpperCase())) {
    slugTitle = words.slice(1).join(" ");
  }

  return slugTitle.length >= 4 ? slugTitle : undefined;
}

function extractBaseSubtitle(title: string): string | undefined {
  const { hasPrefix, left } = splitTitleBySeparator(title);
  if (!hasPrefix) return undefined;
  if (left.length < 3 || isAcronymPrefix(left) || isFestivalPrefix(left)) {
    return undefined;
  }
  return left;
}

function extractAcronymRightTitle(title: string): string | undefined {
  const { hasPrefix, left, right } = splitTitleBySeparator(title);
  if (!hasPrefix || !isAcronymPrefix(left)) return undefined;
  if (right.length < 4 || extractContentTokens(right).length < 3) {
    return undefined;
  }
  return right;
}

function romanNumeralsKey(value: string): string {
  return (
    value
      .toUpperCase()
      .match(/\b(?:I|II|III|IV|V|VI|VII|VIII|IX|X)\b/g)
      ?.join(",") ?? ""
  );
}

function hasConflictingNumberTokens(
  qTokens: string[],
  candTokens: Set<string>,
): boolean {
  const qNums = qTokens.filter((token) => /^\d+$/.test(token));
  const candNums = [...candTokens].filter((token) => /^\d+$/.test(token));
  if (qNums.length === 0 || candNums.length === 0) return false;
  return !qNums.every((num) => candTokens.has(num));
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = Array.from({ length: n + 1 }, (_, index) => index);
  for (let i = 1; i <= m; i++) {
    const curr = new Array<number>(n + 1);
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const del = (prev[j] ?? i) + 1;
      const ins = (curr[j - 1] ?? j) + 1;
      const sub = (prev[j - 1] ?? i + j) + cost;
      curr[j] = Math.min(del, ins, sub);
    }
    prev = curr;
  }

  return prev[n] ?? Math.max(m, n);
}

/**
 * Limpia sufijos promocionales de los cines (ej. "[2006]", "(1988)", "50 AÑOS", "BONUS", "PT2")
 * y genera consultas en cascada de mayor a menor especificidad para TMDB.
 */
export function parseMovieTitleForSearch(
  rawTitle: string,
  options: TmdbSearchOptions = {},
): ParsedMovieSearch {
  const yearMatch = rawTitle.match(/[\(\[](\d{4})[\)\]]/);
  const explicitYear = yearMatch ? Number(yearMatch[1]) : undefined;

  const annivMatch = rawTitle.match(/\b(\d{1,3})\s*°?\s*(?:AÑOS|ANIVERSARIO)\b/i);
  const annivYears = annivMatch ? Number(annivMatch[1]) : undefined;
  const approxYear =
    !explicitYear && annivYears && annivYears >= 5 && annivYears <= 120
      ? new Date().getFullYear() - annivYears
      : undefined;

  const isReRelease = Boolean(
    explicitYear || approxYear || /\bREESTRENO\b/i.test(rawTitle),
  );

  const cleaned = cleanPromotionalTitle(rawTitle);
  const queries: string[] = [];
  const addQuery = (candidate?: string) => {
    const trimmed = candidate?.trim();
    if (!trimmed || trimmed.length < 2) return;
    const key = normalizeTitleKey(trimmed);
    if (!key) return;
    if (!queries.some((existing) => normalizeTitleKey(existing) === key)) {
      queries.push(trimmed);
    }
  };

  const { hasPrefix, left, right } = splitTitleBySeparator(cleaned);

  // En funciones de festival/ciclo evitamos dividir hacia el nombre genérico suelto
  if (hasPrefix && isFestivalPrefix(left)) {
    addQuery(cleaned);
    return {
      queries,
      year: explicitYear,
      approxYear,
      isReRelease,
      canonicalTitle: cleaned,
      isFestival: true,
    };
  }

  addQuery(cleaned);

  if (options.tituloOriginal) {
    const cleanOrig = cleanPromotionalTitle(options.tituloOriginal);
    if (cleanOrig.length >= 3) {
      addQuery(cleanOrig);
    }
  }

  const slugTitle = titleFromOrigenSlug(options.origenId);
  if (slugTitle) {
    addQuery(slugTitle);
  }

  if (hasPrefix) {
    if (left.length >= 3 && !isFestivalPrefix(left) && !isAcronymPrefix(left)) {
      addQuery(left);
    }
    if (right.length >= 4 && extractContentTokens(right).length >= 2) {
      addQuery(right);
    }
  }

  const noArticle = stripLeadingArticle(cleaned);
  if (noArticle !== cleaned && noArticle.length >= 4) {
    addQuery(noArticle);
  }

  const contentWords = normalizeContentWords(cleaned);
  if (contentWords.split(" ").filter(Boolean).length >= 2) {
    addQuery(contentWords);
  }

  return {
    queries,
    year: explicitYear,
    approxYear,
    isReRelease,
    canonicalTitle: cleaned,
    isFestival: false,
  };
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
  const canonicalA = parsedA.canonicalTitle || a.titulo;
  const canonicalB = parsedB.canonicalTitle || b.titulo;
  const keyA = normalizeTitleKey(canonicalA);
  const keyB = normalizeTitleKey(canonicalB);

  if (keyA && keyA === keyB) {
    return true;
  }

  const noArtA = normalizeTitleKey(stripLeadingArticle(canonicalA));
  const noArtB = normalizeTitleKey(stripLeadingArticle(canonicalB));
  if (noArtA.length >= 6 && noArtB.length >= 6 && noArtA === noArtB) {
    return true;
  }

  const rightA = extractAcronymRightTitle(canonicalA);
  const rightB = extractAcronymRightTitle(canonicalB);
  if (rightA && normalizeTitleKey(rightA) === keyB) {
    return true;
  }
  if (rightB && normalizeTitleKey(rightB) === keyA) {
    return true;
  }

  if (
    Math.abs(a.duracion - b.duracion) <= 5 &&
    keyA.length >= 10 &&
    keyB.length >= 10 &&
    keyA.replace(/\D/g, "") === keyB.replace(/\D/g, "") &&
    romanNumeralsKey(canonicalA) === romanNumeralsKey(canonicalB) &&
    levenshteinDistance(keyA, keyB) <= 1
  ) {
    return true;
  }

  const aTruncated = /:\s*$/.test(a.titulo.trim());
  const bTruncated = /:\s*$/.test(b.titulo.trim());
  const baseB = extractBaseSubtitle(canonicalB);
  const baseA = extractBaseSubtitle(canonicalA);
  if (aTruncated && baseB && keyA === normalizeTitleKey(baseB)) {
    return true;
  }
  if (bTruncated && baseA && keyB === normalizeTitleKey(baseA)) {
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

async function fetchTmdbMovieDetail(
  tmdbId: number,
  apiKey: string,
  language: string,
): Promise<TmdbMovieDetail | null> {
  try {
    const detailUrl = new URL(`${TMDB_BASE_URL}/movie/${tmdbId}`);
    detailUrl.searchParams.set("api_key", apiKey);
    detailUrl.searchParams.set("language", language);
    const response = await fetch(detailUrl);
    if (!response.ok) return null;
    return (await response.json()) as TmdbMovieDetail;
  } catch {
    return null;
  }
}

function buildTargetTitles(
  parsed: ParsedMovieSearch,
  options: TmdbSearchOptions,
): string[] {
  const targets = [parsed.canonicalTitle];

  const { hasPrefix, right } = splitTitleBySeparator(parsed.canonicalTitle);
  if (hasPrefix && right.length >= 4 && extractContentTokens(right).length >= 3) {
    targets.push(right);
  }

  if (options.tituloOriginal) {
    const cleanOrig = cleanPromotionalTitle(options.tituloOriginal);
    if (cleanOrig) targets.push(cleanOrig);
  }

  const slugTitle = titleFromOrigenSlug(options.origenId);
  if (slugTitle) targets.push(slugTitle);

  return targets;
}

function tokenContainmentScore(
  target: string,
  candTokens: Set<string>,
): number {
  const qTokens = extractContentTokens(target);
  if (qTokens.length < 2) return 0;

  if (hasConflictingNumberTokens(qTokens, candTokens)) {
    return 0;
  }

  let matched = 0;
  for (const qt of qTokens) {
    if (
      candTokens.has(qt) ||
      [...candTokens].some(
        (ct) =>
          ct.length >= 4 &&
          qt.length >= 4 &&
          (ct.startsWith(qt) || qt.startsWith(ct)),
      )
    ) {
      matched++;
    }
  }

  const ratio = matched / qTokens.length;
  if (ratio === 1 && qTokens.length >= 2) return 45;
  if (ratio >= 0.7 && qTokens.length >= 4) return 32;
  if (ratio >= 0.6 && qTokens.length >= 5) return 28;
  return 0;
}

function scoreCandidate(
  candidate: TmdbMovieResult,
  targetTitles: string[],
  parsed: ParsedMovieSearch,
): { score: number; bestTitleScore: number } {
  let score = 0;
  const releaseYear = candidate.release_date
    ? Number(candidate.release_date.slice(0, 4))
    : undefined;

  const candTitle = candidate.title || "";
  const candOrig = candidate.original_title || "";
  const titleNorm = normalizeTitleKey(candTitle);
  const origNorm = normalizeTitleKey(candOrig);
  const titleNoArt = normalizeTitleKey(stripLeadingArticle(candTitle));
  const origNoArt = normalizeTitleKey(stripLeadingArticle(candOrig));
  const titleContent = normalizeTitleKey(normalizeContentWords(candTitle));
  const origContent = normalizeTitleKey(normalizeContentWords(candOrig));
  const candBase = normalizeTitleKey(splitTitleBySeparator(candTitle).left || candTitle);
  const candOrigBase = normalizeTitleKey(
    splitTitleBySeparator(candOrig).left || candOrig,
  );
  const candTokens = new Set([
    ...extractContentTokens(candTitle),
    ...extractContentTokens(candOrig),
  ]);

  let bestTitleScore = 0;
  for (const target of targetTitles) {
    const qNorm = normalizeTitleKey(target);
    const qNoArt = normalizeTitleKey(stripLeadingArticle(target));
    const qTokens = extractContentTokens(target);
    const qContent = normalizeTitleKey(qTokens.join(" "));
    const targetBase = normalizeTitleKey(splitTitleBySeparator(target).left || target);
    const numberConflict = hasConflictingNumberTokens(qTokens, candTokens);

    let titleScore = 0;
    if (qNorm && (titleNorm === qNorm || origNorm === qNorm)) {
      titleScore = 60;
    } else if (
      qNoArt.length >= 4 &&
      (titleNoArt === qNoArt || origNoArt === qNoArt)
    ) {
      titleScore = 55;
    } else if (
      qTokens.length >= 2 &&
      qContent.length >= 6 &&
      (titleContent === qContent || origContent === qContent)
    ) {
      titleScore = 52;
    } else {
      titleScore = tokenContainmentScore(target, candTokens);

      if (
        !numberConflict &&
        titleScore < 30 &&
        targetBase.length >= 4 &&
        (candBase === targetBase || candOrigBase === targetBase)
      ) {
        titleScore = 30;
      }

      if (
        !numberConflict &&
        titleScore < 28 &&
        qNorm.length >= 4 &&
        (titleNorm.startsWith(qNorm) ||
          origNorm.startsWith(qNorm) ||
          (qNorm.startsWith(titleNorm) && titleNorm.length >= 5) ||
          (qNorm.startsWith(origNorm) && origNorm.length >= 5))
      ) {
        titleScore = 28;
      }

      if (
        !numberConflict &&
        titleScore < 10 &&
        qNorm.length >= 5 &&
        (titleNorm.includes(qNorm) || origNorm.includes(qNorm))
      ) {
        titleScore = 10;
      }
    }

    if (titleScore > bestTitleScore) {
      bestTitleScore = titleScore;
    }
  }

  score += bestTitleScore;

  if (parsed.year && releaseYear) {
    if (releaseYear === parsed.year) {
      score += 60;
    } else if (Math.abs(releaseYear - parsed.year) <= 1) {
      score += 35;
    } else {
      score -= 15;
    }
  } else if (parsed.approxYear && releaseYear) {
    if (Math.abs(releaseYear - parsed.approxYear) <= 2) {
      score += 45;
    } else {
      score -= 15;
    }
  } else if (!parsed.isReRelease && releaseYear) {
    // Priorizar estrenos actuales solo cuando el título coincide suficientemente
    if (
      releaseYear >= 2024 &&
      releaseYear <= 2027 &&
      bestTitleScore >= MIN_TITLE_SCORE
    ) {
      score += 25;
    }
  }

  if (candidate.backdrop_path) score += 25;
  if (candidate.poster_path) score += 15;
  if (candidate.overview && candidate.overview.trim().length > 20) score += 10;
  score += Math.min(candidate.popularity ?? 0, 20);

  return { score, bestTitleScore };
}

function resolveMetadataArgs(
  apiKeyOrOptions?: string | TmdbSearchOptions,
  maybeOptions?: TmdbSearchOptions,
): { apiKey?: string; options: TmdbSearchOptions } {
  if (typeof apiKeyOrOptions === "string") {
    return { apiKey: apiKeyOrOptions, options: maybeOptions ?? {} };
  }
  return {
    apiKey: process.env.TMDB_API_KEY,
    options: apiKeyOrOptions ?? {},
  };
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

export async function fetchTmdbMovieMetadata(
  titulo: string,
  apiKeyOrOptions?: string | TmdbSearchOptions,
  maybeOptions?: TmdbSearchOptions,
): Promise<TmdbEnrichment | null> {
  const { apiKey, options } = resolveMetadataArgs(apiKeyOrOptions, maybeOptions);
  const trimmedKey = apiKey?.trim();
  if (!trimmedKey) {
    return null;
  }

  const parsed = parseMovieTitleForSearch(titulo, options);
  const targetTitles = buildTargetTitles(parsed, options);
  const isLiveEvent = /\b(?:LIVE VIEWING|WORLD TOUR|CONCERT|TOUR)\b/i.test(titulo);

  const candidatesById = new Map<
    number,
    { item: TmdbMovieResult; score: number; bestTitleScore: number }
  >();
  const detailCache = new Map<number, TmdbMovieDetail | null>();

  const considerResults = (results: TmdbMovieResult[]) => {
    for (const item of results) {
      const { score, bestTitleScore } = scoreCandidate(item, targetTitles, parsed);
      const prev = candidatesById.get(item.id);
      if (!prev || score > prev.score) {
        candidatesById.set(item.id, { item, score, bestTitleScore });
      }
    }
  };

  const getEsMxDetail = async (id: number): Promise<TmdbMovieDetail | null> => {
    if (!detailCache.has(id)) {
      detailCache.set(id, await fetchTmdbMovieDetail(id, trimmedKey, "es-MX"));
    }
    return detailCache.get(id) ?? null;
  };

  const hasStrongCandidate = () => {
    const top = [...candidatesById.values()].sort((a, b) => b.score - a.score)[0];
    return Boolean(
      top &&
        top.score >= STRONG_CANDIDATE_SCORE &&
        top.bestTitleScore >= STRONG_TITLE_SCORE,
    );
  };

  const pickValidated = async () => {
    const ranked = [...candidatesById.values()]
      .filter(
        (candidate) =>
          candidate.score >= MIN_CANDIDATE_SCORE &&
          candidate.bestTitleScore >= MIN_TITLE_SCORE,
      )
      .sort((a, b) => b.score - a.score);

    let winner: {
      item: TmdbMovieResult;
      detail: TmdbMovieDetail | null;
      bestTitleScore: number;
      finalScore: number;
    } | null = null;

    for (const candidate of ranked.slice(0, 3)) {
      const detail = await getEsMxDetail(candidate.item.id);
      let finalScore = candidate.score;

      if (
        !isLiveEvent &&
        detail?.runtime &&
        detail.runtime > 0 &&
        options.duracion &&
        options.duracion > 0
      ) {
        const diff = Math.abs(detail.runtime - options.duracion);
        if (diff > 30) {
          finalScore -= 50;
        } else if (diff <= 10) {
          finalScore += 10;
        }
      }

      if (
        finalScore >= MIN_CANDIDATE_SCORE &&
        (!winner || finalScore > winner.finalScore)
      ) {
        winner = {
          item: candidate.item,
          detail,
          bestTitleScore: candidate.bestTitleScore,
          finalScore,
        };
      }
    }

    return winner;
  };

  for (const query of parsed.queries) {
    considerResults(await searchTmdbQuery(query, trimmedKey, "es-MX"));
    if (hasStrongCandidate()) {
      break;
    }
  }

  let winner = await pickValidated();

  if (!parsed.isFestival && (!winner || winner.bestTitleScore < STRONG_TITLE_SCORE)) {
    for (const query of parsed.queries) {
      considerResults(await searchTmdbQuery(query, trimmedKey, "en-US"));
      if (hasStrongCandidate()) {
        break;
      }
    }
    winner = await pickValidated();
  }

  if (!winner) {
    return null;
  }

  let sinopsis = winner.detail?.overview?.trim() || undefined;

  // Si en es-MX no tiene sinopsis, intentamos obtenerla en es-ES
  if (!sinopsis) {
    const esEsDetail = await fetchTmdbMovieDetail(
      winner.item.id,
      trimmedKey,
      "es-ES",
    );
    if (esEsDetail?.overview?.trim()) {
      sinopsis = esEsDetail.overview.trim();
    }
  }

  const posterPath = winner.detail?.poster_path ?? winner.item.poster_path;
  const backdropPath = winner.detail?.backdrop_path ?? winner.item.backdrop_path;
  const calificacionRaw = numeroNoNegativo(
    winner.detail?.vote_average ?? winner.item.vote_average,
  );
  const calificacionTmdb =
    calificacionRaw !== undefined && calificacionRaw <= 10
      ? calificacionRaw
      : undefined;
  const votosTmdb = enteroNoNegativo(
    winner.detail?.vote_count ?? winner.item.vote_count,
  );
  const popularidadTmdb = numeroNoNegativo(
    winner.detail?.popularity ?? winner.item.popularity,
  );
  const fechaEstrenoTmdb = fechaIsoValida(
    winner.detail?.release_date ?? winner.item.release_date,
  );

  return {
    tmdbId: winner.item.id,
    poster: posterPath ? `${TMDB_IMAGE_BASE}/w780${posterPath}` : undefined,
    banner: backdropPath
      ? `${TMDB_IMAGE_BASE}/original${backdropPath}`
      : undefined,
    sinopsis,
    calificacionTmdb,
    votosTmdb,
    popularidadTmdb,
    fechaEstrenoTmdb,
  };
}
