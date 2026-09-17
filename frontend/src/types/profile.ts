import type { Pelicula, Cine } from './types';

// Representa la asociación de una película guardada por un usuario
export interface FavoritoPelicula {
    usuarioId: number;
    peliculaId: number;
    fechaGuardado: string;
}

// Representa la asociación de un cine habitual guardado por un usuario
export interface FavoritoCine {
    usuarioId: number;
    cineId: number;
    fechaGuardado: string;
}

// Estructura para mostrar los datos del perfil enriquecidos en la vista
export interface PerfilUsuarioDatos {
    // Películas completas que el usuario tiene en su lista
    peliculasFavoritas: Pelicula[];
    // Cines completos que el usuario ha marcado como frecuentes
    cinesFavoritos: Cine[];
}
