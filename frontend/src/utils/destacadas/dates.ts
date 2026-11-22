import type { Pelicula } from "../../types/types.ts";
import { DIAS_MIN_REESTRENO } from "./config.ts";

export const MS_POR_DIA = 86_400_000;

/**
 * Convierte una fecha calendario estricta a milisegundos UTC.
 * @param fecha Fecha candidata en formato `AAAA-MM-DD`.
 * @returns Instante UTC de esa fecha o `null` si no es válida.
 */
export function parsearFechaUtcMs(fecha?: string): number | null {
    if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null;
    const [y, m, d] = fecha.split("-").map(Number);
    if (!y || !m || !d) return null;
    const ms = Date.UTC(y, m - 1, d);
    const check = new Date(ms);
    if (
        check.getUTCFullYear() !== y ||
        check.getUTCMonth() !== m - 1 ||
        check.getUTCDate() !== d
    ) {
        return null;
    }
    return ms;
}

/**
 * Calcula cuántos días separan la fecha indicada del día de referencia.
 * @param fecha Fecha inicial en formato `AAAA-MM-DD`.
 * @param hoy Fecha de referencia en formato `AAAA-MM-DD`.
 * @returns Días transcurridos o `null` si falta una fecha válida.
 */
export function diasDesde(
    fecha: string | undefined,
    hoy: string,
): number | null {
    const desdeMs = parsearFechaUtcMs(fecha);
    const hoyMs = parsearFechaUtcMs(hoy);
    if (desdeMs === null || hoyMs === null) return null;
    return Math.round((hoyMs - desdeMs) / MS_POR_DIA);
}

/**
 * Determina si el estreno original ocurrió hace más del mínimo configurado.
 * @param pelicula Película con fecha de estreno original de TMDB.
 * @param hoy Fecha actual en formato `AAAA-MM-DD`.
 * @returns `true` si puede considerarse un reestreno.
 */
export function esReestreno(pelicula: Pelicula, hoy: string): boolean {
    const antiguedadOriginal = diasDesde(pelicula.fechaEstrenoTmdb, hoy);
    return (
        antiguedadOriginal !== null && antiguedadOriginal > DIAS_MIN_REESTRENO
    );
}
