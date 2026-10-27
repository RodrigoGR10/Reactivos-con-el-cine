import type { Pelicula } from "../types/types.ts";

export const LIMITE_DESTACADAS = 5;

export function totalFavoritos(pelicula: Pelicula): number | undefined {
  const total = pelicula.totalFavoritos;
  return typeof total === "number" && Number.isSafeInteger(total) && total >= 0 ? total : undefined;
}

export function seleccionarDestacadas(peliculas: readonly Pelicula[], limite = LIMITE_DESTACADAS): Pelicula[] {
  if (!Number.isSafeInteger(limite) || limite <= 0) return [];
  const unicas = new Map(peliculas.filter((pelicula) => pelicula.estadoEstreno !== "proximamente")
    .map((pelicula) => [pelicula.id, pelicula]));
  return [...unicas.values()].sort((a, b) =>
    (totalFavoritos(b) ?? 0) - (totalFavoritos(a) ?? 0)
    || Number(a.estadoEstreno === "preventa") - Number(b.estadoEstreno === "preventa")
    || (b.fechaEstreno ?? "").localeCompare(a.fechaEstreno ?? "")
    || a.titulo.localeCompare(b.titulo, "es-CL")
    || a.id.localeCompare(b.id))
    .slice(0, limite);
}
