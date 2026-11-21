import {
    extractAcronymRightTitle,
    extractBaseSubtitle,
    levenshteinDistance,
    normalizeTitleKey,
    parseMovieTitleForSearch,
    romanNumeralsKey,
    stripLeadingArticle,
} from "./consulta.ts";

interface PeliculaCatalogo {
    titulo: string;
    tituloOriginal?: string;
    duracion: number;
    tmdbId?: number;
}

export function areSameCatalogMovie(
    a: PeliculaCatalogo,
    b: PeliculaCatalogo,
): boolean {
    if (a.tmdbId && b.tmdbId) {
        return a.tmdbId === b.tmdbId;
    }

    const parsedA = parseMovieTitleForSearch(a.titulo);
    const parsedB = parseMovieTitleForSearch(b.titulo);
    if (parsedA.year && parsedB.year && parsedA.year !== parsedB.year) {
        return false;
    }

    const canonicalA = parsedA.canonicalTitle || a.titulo;
    const canonicalB = parsedB.canonicalTitle || b.titulo;
    const keyA = normalizeTitleKey(canonicalA);
    const keyB = normalizeTitleKey(canonicalB);

    // Coincidencia exacta tras normalización canónica: tolera duraciones inconsistentes del scraper.
    if (keyA && keyA === keyB) {
        return true;
    }

    // Coincidencia entre título y tituloOriginal entre cadenas si ambos son específicos.
    const origA = a.tituloOriginal
        ? normalizeTitleKey(
              parseMovieTitleForSearch(a.tituloOriginal).canonicalTitle,
          )
        : "";
    const origB = b.tituloOriginal
        ? normalizeTitleKey(
              parseMovieTitleForSearch(b.tituloOriginal).canonicalTitle,
          )
        : "";
    if (
        (origA.length >= 6 && (origA === keyB || origA === origB)) ||
        (origB.length >= 6 && origB === keyA)
    ) {
        return true;
    }

    const duracionConocida = a.duracion > 5 && b.duracion > 5;
    if (duracionConocida && Math.abs(a.duracion - b.duracion) > 10) {
        return false;
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
        (!duracionConocida || Math.abs(a.duracion - b.duracion) <= 5) &&
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
