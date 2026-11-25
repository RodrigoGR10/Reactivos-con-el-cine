/**
 * Comprueba si una duración satisface el filtro seleccionado.
 * @param duracion Duración en minutos, o `null` si se desconoce.
 * @param filtro Rango `corta`, `media`, `larga` o cadena vacía para sin filtro.
 * @returns `true` si la película debe conservarse en los resultados.
 */
export function cumpleFiltroDuracion(
    duracion: number | null,
    filtro: string,
): boolean {
    if (duracion === null) return filtro === "";
    if (filtro === "corta") return duracion <= 100;
    if (filtro === "media") return duracion >= 101 && duracion <= 130;
    if (filtro === "larga") return duracion > 130;
    return true;
}
