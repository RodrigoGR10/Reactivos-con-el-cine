import type { Pelicula } from "../../types/types.ts";
import { normalizarTexto } from "../normalizarTexto.ts";
import { ESTADO_PREVENTA } from "./types.ts";

/** Devuelve un conteo de favoritos solo si es un entero no negativo válido.
 * @param pelicula Datos de la película que se procesa.
 */
export function totalFavoritos(pelicula: Pelicula): number | undefined {
    const total = pelicula.totalFavoritos;
    return typeof total === "number" &&
        Number.isSafeInteger(total) &&
        total >= 0
        ? total
        : undefined;
}

/** Indica si la película tiene un banner distinto del póster.
 * @param pelicula Datos de la película que se procesa.
 * @returns Resultado que indica si se cumple la condición evaluada.
 */
export function tieneBannerHero(pelicula: Pelicula): boolean {
    return Boolean(pelicula.banner && pelicula.banner !== pelicula.poster);
}

const GENEROS_EVENTO_CONCIERTO = new Set([
    "concierto",
    "live viewing",
    "concert",
    "kpop",
    "k-pop",
]);

/** Excluye eventos musicales detectados por género o título.
 * @param pelicula Datos de la película que se procesa.
 * @returns Resultado que indica si se cumple la condición evaluada.
 */
export function esConcierto(pelicula: Pelicula): boolean {
    const generos = normalizarTexto(pelicula.genero)
        .split(/[,/;|]+/)
        .map((g) => g.trim())
        .filter(Boolean);
    if (generos.some((g) => GENEROS_EVENTO_CONCIERTO.has(g))) {
        return true;
    }

    const titulo = normalizarTexto(pelicula.titulo);
    return (
        /\b(?:live\s+viewing|world\s+tour|in\s+concert|concierto|cheering\s+party)\b/.test(
            titulo,
        ) || /:\s*.*\btour\b/.test(titulo)
    );
}

/** Indica si la película no está en estado de preventa.
 * @param pelicula Datos de la película que se procesa.
 * @returns Resultado que indica si se cumple la condición evaluada.
 */
export function esCartelera(pelicula: Pelicula): boolean {
    return pelicula.estadoEstreno !== ESTADO_PREVENTA;
}

/** Orden estable por fecha de estreno, título e identificador.
 * @param a Primer texto que se compara.
 * @param b Segundo texto que se compara.
 * @returns Valor numérico calculado por la operación.
 */
export function compararBase(a: Pelicula, b: Pelicula): number {
    return (
        (b.fechaEstreno ?? "").localeCompare(a.fechaEstreno ?? "") ||
        a.titulo.localeCompare(b.titulo, "es-CL") ||
        a.id.localeCompare(b.id)
    );
}

/** Ordena por presencia en cines, funciones y popularidad TMDB, en ese orden.
 * @param a Primer texto que se compara.
 * @param b Segundo texto que se compara.
 * @returns Valor numérico calculado por la operación.
 */
export function compararPresencia(a: Pelicula, b: Pelicula): number {
    return (
        (b.totalCines ?? 0) - (a.totalCines ?? 0) ||
        (b.totalFunciones ?? 0) - (a.totalFunciones ?? 0) ||
        (b.popularidadTmdb ?? 0) - (a.popularidadTmdb ?? 0)
    );
}
