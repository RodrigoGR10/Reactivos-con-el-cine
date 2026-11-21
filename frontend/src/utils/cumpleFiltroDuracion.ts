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
