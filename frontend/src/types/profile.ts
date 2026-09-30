import type { Pelicula, Cine } from './types';

export interface FavoritoPelicula {
    usuarioId: number;
    peliculaId: number;
    fechaGuardado: string;
}

export interface FavoritoCine {
    usuarioId: number;
    cineId: number;
    fechaGuardado: string;
}

export interface PerfilUsuarioDatos {
    peliculasFavoritas: Pelicula[];
    cinesFavoritos: Cine[];
}
