// Normalizaciones de títulos de películas.
// Cada "clave" responde a una pregunta distinta, por eso no son intercambiables.

export function sinAcentosEnMayusculas(titulo: string): string {
    return titulo
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase();
}

function soloAlfanumericos(texto: string): string {
    return texto.replace(/[^A-Z0-9]/g, "");
}

// Comparación exacta de títulos ya limpios (matching contra TMDB).
export function claveBasica(titulo: string): string {
    return soloAlfanumericos(sinAcentosEnMayusculas(titulo));
}

// ¿Dos películas locales proponen el mismo TMDB ID con títulos compatibles?
export function claveParaConflictos(titulo: string): string {
    const limpio = sinAcentosEnMayusculas(titulo)
        .replace(/[\[(]\d{4}[\])]/g, "")
        .replace(/\b(4K|3D|2D|IMAX|XD)\b/g, "");

    return soloAlfanumericos(limpio);
}

// ¿Dos películas locales sin TMDB parecen ser la misma? (deduplicación)
export function claveParaDuplicados(titulo: string): string {
    const limpio = sinAcentosEnMayusculas(titulo)
        .replace(
            /\b(4K|3D|2D|IMAX|XD|BONUS|REESTRENO|PRE-ESTRENO|INFINITY VISION)\b/g,
            " ",
        )
        .replace(/\b\d{4}\b/g, " ")
        .replace(/\b\d+\s*(°|º)?\s*ANIVERSARIO\b/g, " ")
        .replace(/\bPARTE\s*[12]\b/g, " ")
        .replace(/\bPT[12]\b/g, " ");

    return soloAlfanumericos(limpio);
}
