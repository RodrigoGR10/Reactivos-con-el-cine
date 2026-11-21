import type { Pelicula } from "../../types/types.ts";
import { DIAS_MIN_REESTRENO } from "./config.ts";

export const MS_POR_DIA = 86_400_000;

export function fechaHoySantiago(): string {
    try {
        const formatted = new Intl.DateTimeFormat("en-CA", {
            timeZone: "America/Santiago",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).format(new Date());
        if (/^\d{4}-\d{2}-\d{2}$/.test(formatted)) {
            return formatted;
        }
    } catch {
        // Fallback al reloj local si Intl no soporta la zona horaria
    }
    const ahora = new Date();
    const y = ahora.getFullYear();
    const m = String(ahora.getMonth() + 1).padStart(2, "0");
    const d = String(ahora.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

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

export function diasDesde(
    fecha: string | undefined,
    hoy: string,
): number | null {
    const desdeMs = parsearFechaUtcMs(fecha);
    const hoyMs = parsearFechaUtcMs(hoy);
    if (desdeMs === null || hoyMs === null) return null;
    return Math.round((hoyMs - desdeMs) / MS_POR_DIA);
}

export function esReestreno(pelicula: Pelicula, hoy: string): boolean {
    const antiguedadOriginal = diasDesde(pelicula.fechaEstrenoTmdb, hoy);
    return (
        antiguedadOriginal !== null && antiguedadOriginal > DIAS_MIN_REESTRENO
    );
}
