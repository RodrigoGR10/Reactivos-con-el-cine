import type { Pelicula } from "../../types/types";

export const LIMITE_DESTACADAS = 6;

export type CategoriaDestacada =
  | "favoritas"
  | "estrenos_recientes"
  | "mejor_valoradas"
  | "en_mas_salas"
  | "preventas_esperadas"
  | "reestrenos"
  | "destacada";

export type EstrategiaSeleccion = "top" | "aleatoria";

export interface ReglaCupoCategoria {
  categoria: Exclude<CategoriaDestacada, "destacada">;
  min: number;
  max: number;
  pesoVariable: number;
  estrategia: EstrategiaSeleccion;
  topAleatorio?: number;
}

export type ComplementoEtiquetaDestacada =
  | { tipo: "fecha"; valor: string }
  | { tipo: "calificacion"; valor: string }
  | { tipo: "favoritos"; valor: number };

export interface PeliculaDestacadaSeleccionada {
  pelicula: Pelicula;
  categoria: CategoriaDestacada;
  etiqueta: string;
  complemento?: ComplementoEtiquetaDestacada;
  rangoCategoria?: number;
}

export interface OpcionesSeleccionDestacadas {
  limite?: number;
  hoy?: string;
  rng?: () => number;
  reglas?: readonly ReglaCupoCategoria[];
  mezclarOrden?: boolean;
}

export type CategoriaPoolId = Exclude<CategoriaDestacada, "destacada">;
