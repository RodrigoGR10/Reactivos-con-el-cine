import type { Butacas } from "../../scraper/butacas.ts";

export interface SesionButacas {
    fecha: string;
    horario: string;
    peliculaId?: string;
    butacas?: Butacas;
}

export type CarteleraButacas = Map<string, SesionButacas>;

/** Cadenas cuya ocupacion se publica en una cartelera propia. */
export type OrigenCartelera = "cinemark" | "muvix" | "cinestar";
