import type { Pelicula } from "../types/types.ts";

export const LIMITE_DESTACADAS = 6;

export type CategoriaDestacada = "favoritas";

export type ComplementoEtiquetaDestacada =
  | { tipo: "fecha"; valor: string }
  | { tipo: "calificacion"; valor: string };

export interface PeliculaDestacadaSeleccionada {
  pelicula: Pelicula;
  categoria: CategoriaDestacada;
  etiqueta: string;
  complemento?: ComplementoEtiquetaDestacada;
  rangoCategoria?: number;
}

export interface OpcionesSeleccionDestacadas {
  limite?: number;
}

export function totalFavoritos(pelicula: Pelicula): number | undefined {
  const total = pelicula.totalFavoritos;
  return typeof total === "number" && Number.isSafeInteger(total) && total >= 0
    ? total
    : undefined;
}

export function seleccionarDestacadasConCategoria(
  peliculas: readonly Pelicula[],
  opciones: OpcionesSeleccionDestacadas = {},
): PeliculaDestacadaSeleccionada[] {
  const limite = opciones.limite ?? LIMITE_DESTACADAS;
  if (!Number.isSafeInteger(limite) || limite <= 0) return [];

  const unicas = new Map(peliculas.map((pelicula) => [pelicula.id, pelicula]));

  return [...unicas.values()]
    .filter(
      (pelicula) =>
        pelicula.estadoEstreno !== "proximamente" &&
        (totalFavoritos(pelicula) ?? 0) > 0,
    )
    .sort(
      (a, b) =>
        (totalFavoritos(b) ?? 0) - (totalFavoritos(a) ?? 0) ||
        a.titulo.localeCompare(b.titulo, "es-CL") ||
        a.id.localeCompare(b.id),
    )
    .slice(0, limite)
    .map((pelicula, indice) => ({
      pelicula,
      categoria: "favoritas",
      etiqueta: `N° ${indice + 1} por me gusta`,
      rangoCategoria: indice + 1,
    }));
}

export function seleccionarDestacadas(
  peliculas: readonly Pelicula[],
  limite = LIMITE_DESTACADAS,
): Pelicula[] {
  return seleccionarDestacadasConCategoria(peliculas, { limite }).map(
    (item) => item.pelicula,
  );
}
