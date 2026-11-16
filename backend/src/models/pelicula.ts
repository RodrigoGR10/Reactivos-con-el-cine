import dotenv from "dotenv";
dotenv.config();

import type { Origen } from "../scraper/types.ts";
import type { DatosEstreno } from "../utils/estreno.ts";

export interface FuentePelicula extends Partial<DatosEstreno> {
    id?: number;
    peliculaId?: number;
    cadena: Origen;
    origenId: string;
    creadoEn?: Date;
}

export interface Pelicula {
    id: number;
    titulo: string;
    tituloOriginal?: string;
    duracion: number;
    genero?: string;
    clasificacion: string;
    sinopsis: string;
    posterUrl: string;
    bannerUrl?: string;
    trailerUrl?: string;
    tmdbId?: number;
    url?: string;
    origen?: string;
    origenId?: string;
    extraidoEn?: string;
    fuentes?: FuentePelicula[];
}

// DTOs (Data Transfer Objects) para tipar las inserciones omitiendo campos autogenerados
export type CrearPeliculaDTO = Omit<Pelicula, "id" | "creadoEn" | "fuentes">;
export type CrearPeliculaFuenteDTO = Omit<FuentePelicula, "id" | "creadoEn">;
