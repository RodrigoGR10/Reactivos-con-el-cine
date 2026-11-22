import type { Pelicula } from "../../types/types.ts";

export const LIMITE_DESTACADAS = 6;

export const ESTADO_PREVENTA = "preventa" as const;
export const ESTADO_PROXIMAMENTE = "proximamente" as const;

/**
 * Categorías de películas que pueden aparecer en el carrusel destacado.
 */
export type CategoriaDestacada =
    | "favoritas"
    | "estrenos_recientes"
    | "mejor_valoradas"
    | "en_mas_salas"
    | "preventas_esperadas"
    | "reestrenos"
    | "destacada";

/**
 * Identificador del grupo de películas que alimenta una categoría destacada.
 */
export type CategoriaPoolId = Exclude<CategoriaDestacada, "destacada">;

/**
 * Estrategia usada para ponderar y seleccionar películas destacadas.
 */
export type EstrategiaSeleccion = "top" | "aleatoria";

/**
 * Límite de participación de una categoría dentro de las destacadas.
 */
export interface ReglaCupoCategoria {
    categoria: CategoriaPoolId;
    min: number;
    max: number;
    pesoVariable: number;
    estrategia: EstrategiaSeleccion;
    topAleatorio?: number;
}

/**
 * Etiqueta adicional que explica por qué se destaca una película.
 */
export type ComplementoEtiquetaDestacada =
    | { tipo: "fecha"; valor: string }
    | { tipo: "calificacion"; valor: string }
    | { tipo: "favoritos"; valor: number };

/**
 * Película seleccionada con su etiqueta y categoría de origen.
 */
export interface PeliculaDestacadaSeleccionada {
    pelicula: Pelicula;
    categoria: CategoriaDestacada;
    etiqueta: string;
    complemento?: ComplementoEtiquetaDestacada;
    rangoCategoria?: number;
}

/**
 * Parámetros de selección y ponderación del carrusel de destacadas.
 */
export interface OpcionesSeleccionDestacadas {
    limite?: number;
    hoy?: string;
    rng?: () => number;
    reglas?: readonly ReglaCupoCategoria[];
    mezclarOrden?: boolean;
}
