import type { Pelicula, Cine } from "./types";

export interface FavoritoPelicula {
  usuarioId: string;
  peliculaId: string;
  fechaGuardado: string;
}

export interface FavoritoCine {
  usuarioId: string;
  cineId: string;
  fechaGuardado: string;
}

export interface PerfilUsuarioDatos {
  peliculasFavoritas: Pelicula[];
  cinesFavoritos: Cine[];
}
