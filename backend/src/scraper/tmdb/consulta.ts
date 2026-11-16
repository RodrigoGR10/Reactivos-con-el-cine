import { sinAcentosEnMayusculas } from "../../utils/titulos.ts";

export interface TmdbSearchOptions {
    tituloOriginal?: string | null;
    duracion?: number | null;
    origenId?: string | null;
}

export interface ParsedMovieSearch {
    queries: string[];
    titulosPrincipales: string[];
    year?: number;
    approxYear?: number;
    isReRelease: boolean;
    canonicalTitle: string;
    isFestival: boolean;
}

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

export function normalizeNumberWords(value: string): string {
    return sinAcentosEnMayusculas(value).replace(
        NUMBER_WORDS_REGEX,
        (match) => NUMBER_WORDS[match] ?? match,
    );
}

export function normalizeTitleKey(value: string): string {
    return normalizeNumberWords(value).replace(/[^A-Z0-9]/g, "");
}

export function stripLeadingArticle(value: string): string {
    return value.replace(/^(?:el|la|los|las|un|una|the|a|an)\s+/i, "").trim();
}

export function extractContentTokens(value: string): string[] {
    return normalizeNumberWords(value)
        .replace(/[^A-Z0-9\s]/g, " ")
        .split(/\s+/)
        .filter(
            (word) =>
                (word.length >= 2 || /^\d+$/.test(word)) &&
                !STOPWORDS.has(word),
        );
}

export function normalizeContentWords(value: string): string {
    return extractContentTokens(value).join(" ");
}

export function cleanPromotionalTitle(rawTitle: string): string {
    return rawTitle
        .replace(/[\(\[]\d{4}[\)\]]/g, "")
        .replace(/\b(4K|3D|2D|IMAX|XD)\b/gi, "")
        .replace(/\bPT\.?\s*2\b/gi, "PARTE 2")
        .replace(/\bPT\.?\s*1\b/gi, "PARTE 1")
        .replace(/(?::\s*)?\b\d+\s*°?\s*(?:AÑOS|ANIVERSARIO)\b/gi, "")
        .replace(
            /\b(BONUS|REESTRENO|PRE-?ESTRENO|INFINITY VISION|LIVE VIEWING)\b/gi,
            "",
        )
        .replace(/(?::\s*|-\s*|\s+)LIVE\s*$/i, "")
        .replace(/[:\-–]+\s*$/, "")
        .replace(/\s+/g, " ")
        .trim();
}

export function isFestivalPrefix(prefix: string): boolean {
    return (
        /\b(?:FESTIVAL|CICLO|MUESTRA|TEMPORADA)\b/i.test(prefix) ||
        /^SANFIC\d*$/i.test(prefix.trim())
    );
}

export function isAcronymPrefix(prefix: string): boolean {
    return /^[A-Z]{2,4}$/.test(prefix.trim());
}

export function splitTitleBySeparator(title: string): {
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

export function titleFromOrigenSlug(origenId?: string | null): string | undefined {
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

export function extractBaseSubtitle(title: string): string | undefined {
    const { hasPrefix, left } = splitTitleBySeparator(title);
    if (!hasPrefix) return undefined;
    if (left.length < 3 || isAcronymPrefix(left) || isFestivalPrefix(left)) {
        return undefined;
    }
    return left;
}

export function extractAcronymRightTitle(title: string): string | undefined {
    const { hasPrefix, left, right } = splitTitleBySeparator(title);
    if (!hasPrefix || !isAcronymPrefix(left)) return undefined;
    if (right.length < 4 || extractContentTokens(right).length < 3) {
        return undefined;
    }
    return right;
}

export function romanNumeralsKey(value: string): string {
    return (
        value
            .toUpperCase()
            .match(/\b(?:I|II|III|IV|V|VI|VII|VIII|IX|X)\b/g)
            ?.join(",") ?? ""
    );
}

export function hasConflictingNumberTokens(
    qTokens: string[],
    candTokens: Set<string>,
): boolean {
    const qNums = qTokens.filter((token) => /^\d+$/.test(token));
    const candNums = [...candTokens].filter((token) => /^\d+$/.test(token));
    if (qNums.length === 0 || candNums.length === 0) return false;
    return !qNums.every((num) => candTokens.has(num));
}

export function levenshteinDistance(a: string, b: string): number {
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
    optionsOrOriginal?: TmdbSearchOptions | string | null,
): ParsedMovieSearch {
    const options: TmdbSearchOptions =
        typeof optionsOrOriginal === "string"
            ? { tituloOriginal: optionsOrOriginal }
            : (optionsOrOriginal ?? {});

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
    const addQuery = (candidate?: string | null) => {
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
            titulosPrincipales: [...queries],
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

    const titulosPrincipales = [...queries];

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
        titulosPrincipales,
        year: explicitYear,
        approxYear,
        isReRelease,
        canonicalTitle: cleaned,
        isFestival: false,
    };
}

export function buildTargetTitles(
    parsed: ParsedMovieSearch,
    options: TmdbSearchOptions = {},
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
