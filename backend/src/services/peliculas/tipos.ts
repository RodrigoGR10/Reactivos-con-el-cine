import type { EstadoEstreno } from "../../utils/estreno.ts";

/**
 * Fila de película recuperada desde PostgreSQL para fusionar duplicados.
 */
export interface PeliculaRow {
    id: number;
    titulo: string;
    titulo_original: string | null;
    sinopsis: string | null;
    duracion: number | null;
    genero: string | null;
    clasificacion: string | null;
    poster: string | null;
    posterLimpio: string | null;
    trailerUrl: string | null;
    trailerVersion: "doblado" | "original" | "subtitulado" | null;
    banner: string | null;
    tmdb_id: number | null;
    calificacion_tmdb: number | null;
    votos_tmdb: number | null;
    popularidad_tmdb: number | null;
    fecha_estreno_tmdb: string | null;
    total_cines?: number;
    total_funciones?: number;
}

/**
 * Forma de una fila de base de datos utilizada por la consulta y serialización de películas.
 */
export interface FuenteRow {
    pelicula_id: number;
    origen: string;
    origen_id: string;
    estado_estreno: EstadoEstreno | null;
    fecha_estreno: string | null;
}
