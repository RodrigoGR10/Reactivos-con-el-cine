import dotenv from "dotenv";
dotenv.config();

export interface TmdbEnrichment {
  tmdbId: number;
  poster?: string;
  banner?: string;
  sinopsis?: string;
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
  const separatorMatch = cleaned.split(/\s*[:\-–]\s*/);
  if (separatorMatch.length > 1 && separatorMatch[0]!.trim().length >= 3) {
    const baseTitle = separatorMatch[0]!.trim();
    if (!queries.includes(baseTitle)) {
      queries.push(baseTitle);
    }
  }

  return { queries, year: explicitYear };
}
