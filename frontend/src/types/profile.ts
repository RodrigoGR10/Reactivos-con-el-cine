import type { Pelicula, Cine } from "./types";

/**
 * Película que aparece en la lista de favoritos del perfil.
 */
export interface FavoritoPelicula {
    usuarioId: string;
    peliculaId: string;
    fechaGuardado: string;
}

/**
 * Cine que aparece en la lista de favoritos del perfil.
 */
export interface FavoritoCine {
    usuarioId: string;
    cineId: string;
    fechaGuardado: string;
}

/**
 * Datos del perfil y sus listas de favoritos.
 */
export interface PerfilUsuarioDatos {
    peliculasFavoritas: Pelicula[];
    cinesFavoritos: Cine[];
}
