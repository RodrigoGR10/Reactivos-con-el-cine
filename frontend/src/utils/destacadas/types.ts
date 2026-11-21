import type { Pelicula } from "../../types/types.ts";

export const LIMITE_DESTACADAS = 6;

export const ESTADO_PREVENTA = "preventa" as const;
export const ESTADO_PROXIMAMENTE = "proximamente" as const;

export type CategoriaDestacada =
    | "favoritas"
    | "estrenos_recientes"
    | "mejor_valoradas"
    | "en_mas_salas"
    | "preventas_esperadas"
    | "reestrenos"
    | "destacada";

export type CategoriaPoolId = Exclude<CategoriaDestacada, "destacada">;

export type EstrategiaSeleccion = "top" | "aleatoria";

export interface ReglaCupoCategoria {
    categoria: CategoriaPoolId;
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
