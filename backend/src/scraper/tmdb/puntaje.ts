import {
    extractContentTokens,
    hasConflictingNumberTokens,
    normalizeContentWords,
    normalizeTitleKey,
    splitTitleBySeparator,
    stripLeadingArticle,
    type ParsedMovieSearch,
} from "./consulta.ts";
import type { TmdbMovieResult } from "./types.ts";

export const MIN_CANDIDATE_SCORE = 65;
export const MIN_TITLE_SCORE = 25;
export const STRONG_TITLE_SCORE = 52;
export const STRONG_CANDIDATE_SCORE = 95;

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

export function esCoincidenciaExacta(
    candidate: TmdbMovieResult,
    consulta: string,
): boolean {
    const qNorm = normalizeTitleKey(consulta);
    const titleNorm = normalizeTitleKey(candidate.title || "");
    const origNorm = normalizeTitleKey(candidate.original_title || "");

    return qNorm.length > 0 && (titleNorm === qNorm || origNorm === qNorm);
}

export function scoreCandidate(
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
    const candBase = normalizeTitleKey(
        splitTitleBySeparator(candTitle).left || candTitle,
    );
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
        const targetBase = normalizeTitleKey(
            splitTitleBySeparator(target).left || target,
        );
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
    if (candidate.overview && candidate.overview.trim().length > 20)
        score += 10;
    score += Math.min(candidate.popularity ?? 0, 20);

    return { score, bestTitleScore };
}
