import type { Origen } from "../scraper/types.ts";
import type { DatosEstreno } from "../utils/estreno.ts";

/**
 * Identidad y metadatos de una película obtenidos desde una fuente externa.
 */
export interface FuentePelicula extends Partial<DatosEstreno> {
    id?: number;
    peliculaId?: number;
    cadena: Origen;
    origenId: string;
    creadoEn?: Date;
}

/**
 * Representa una película del catálogo y sus metadatos normalizados.
 */
export interface Pelicula {
    id: number;
    titulo: string;
    tituloOriginal?: string;
    duracion: number | null;
    genero?: string;
    clasificacion: string;
    sinopsis: string;
    posterUrl: string;
    bannerUrl?: string;
    trailerUrl?: string;
    tmdbId?: number;
    calificacionTmdb?: number;
    votosTmdb?: number;
    popularidadTmdb?: number;
    fechaEstrenoTmdb?: string;
    url?: string;
    origen?: string;
    origenId?: string;
    extraidoEn?: string;
    fuentes?: FuentePelicula[];
}

// DTOs (Data Transfer Objects) para tipar las inserciones omitiendo campos autogenerados
/**
 * Datos de película que se pueden guardar o actualizar en el catálogo.
 */
export type CrearPeliculaDTO = Omit<Pelicula, "id" | "creadoEn" | "fuentes">;
/**
 * Datos necesarios para asociar una película con una fuente externa.
 */
export type CrearPeliculaFuenteDTO = Omit<FuentePelicula, "id" | "creadoEn">;
