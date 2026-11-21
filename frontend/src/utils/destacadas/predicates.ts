import type { Pelicula } from "../../types/types.ts";
import { normalizarTexto } from "../normalizarTexto.ts";
import { ESTADO_PREVENTA } from "./types.ts";

export function totalFavoritos(pelicula: Pelicula): number | undefined {
    const total = pelicula.totalFavoritos;
    return typeof total === "number" &&
        Number.isSafeInteger(total) &&
        total >= 0
        ? total
        : undefined;
}

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

export function esCartelera(pelicula: Pelicula): boolean {
    return pelicula.estadoEstreno !== ESTADO_PREVENTA;
}

export function compararBase(a: Pelicula, b: Pelicula): number {
    return (
        (b.fechaEstreno ?? "").localeCompare(a.fechaEstreno ?? "") ||
        a.titulo.localeCompare(b.titulo, "es-CL") ||
        a.id.localeCompare(b.id)
    );
}

export function compararPresencia(a: Pelicula, b: Pelicula): number {
    return (
        (b.totalCines ?? 0) - (a.totalCines ?? 0) ||
        (b.totalFunciones ?? 0) - (a.totalFunciones ?? 0) ||
        (b.popularidadTmdb ?? 0) - (a.popularidadTmdb ?? 0)
    );
}
