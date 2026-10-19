import axios from "axios";
import { API_BASE_URL } from "./apiConfig";

const STORAGE_KEY_CSRF = "csrfToken";
const baseUrl = `${API_BASE_URL}/perfil`;

interface FavoritosResponse {
  peliculasFavoritas: string[];
  cinesFavoritos: string[];
}

const getAuthConfig = (signal?: AbortSignal) => {
  const csrfToken = localStorage.getItem(STORAGE_KEY_CSRF);
  return {
    withCredentials: true,
    signal,
    headers: csrfToken ? { "X-CSRF-Token": csrfToken } : {},
  };
};

const getFavorites = async (
  signal?: AbortSignal,
): Promise<FavoritosResponse> => {
  const { data } = await axios.get<FavoritosResponse>(
    `${baseUrl}/favoritos`,
    getAuthConfig(signal),
  );

  return {
    peliculasFavoritas: Array.isArray(data.peliculasFavoritas)
      ? data.peliculasFavoritas
      : [],
    cinesFavoritos: Array.isArray(data.cinesFavoritos)
      ? data.cinesFavoritos
      : [],
  };
};

const toggleFavoriteMovie = async (movieId: string): Promise<string[]> => {
  const { data } = await axios.post<{ peliculasFavoritas: string[] }>(
    `${baseUrl}/favoritos/peliculas/${encodeURIComponent(movieId)}`,
    {},
    getAuthConfig(),
  );

  return Array.isArray(data.peliculasFavoritas) ? data.peliculasFavoritas : [];
};

const toggleFavoriteCinema = async (cinemaId: string): Promise<string[]> => {
  const { data } = await axios.post<{ cinesFavoritos: string[] }>(
    `${baseUrl}/favoritos/cines/${encodeURIComponent(cinemaId)}`,
    {},
    getAuthConfig(),
  );

  return Array.isArray(data.cinesFavoritos) ? data.cinesFavoritos : [];
};

export default {
  getFavorites,
  toggleFavoriteMovie,
  toggleFavoriteCinema,
};
