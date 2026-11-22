import type { Butacas } from "../../scraper/butacas.ts";

/**
 * Estado de disponibilidad de butacas publicado para una función.
 */
export interface SesionButacas {
    fecha: string;
    horario: string;
    peliculaId?: string;
    butacas?: Butacas;
}

/**
 * Mapa de funciones y disponibilidad de butacas asociadas.
 */
export type CarteleraButacas = Map<string, SesionButacas>;

/** Cadenas cuya ocupacion se publica en una cartelera propia. */
export type OrigenCartelera = "cinemark" | "muvix" | "cinestar";
