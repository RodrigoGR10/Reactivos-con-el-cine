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

/**
 * Obtiene las listas de favoritos de la persona autenticada.
 * @param signal Señal opcional para cancelar la petición.
 * @returns Identificadores de películas y cines guardados.
 */
const getFavorites = async (
    signal?: AbortSignal,
): Promise<FavoritosResponse> => {
    const { data } = await axios.get<FavoritosResponse>(
        `${baseUrl}/favoritos`,
        getAuthConfig(signal),
    );

    return {
        peliculasFavoritas: Array.isArray(data.peliculasFavoritas)
            ? data.peliculasFavoritas.map(String)
            : [],
        cinesFavoritos: Array.isArray(data.cinesFavoritos)
            ? data.cinesFavoritos.map(String)
            : [],
    };
};

/**
 * Alterna una película en la lista de favoritos del usuario.
 * @param movieId Identificador de la película.
 * @returns Lista actualizada de películas favoritas.
 */
const toggleFavoriteMovie = async (movieId: string): Promise<string[]> => {
    const { data } = await axios.post<{ peliculasFavoritas: string[] }>(
        `${baseUrl}/favoritos/peliculas/${encodeURIComponent(movieId)}`,
        {},
        getAuthConfig(),
    );

    return Array.isArray(data.peliculasFavoritas)
        ? data.peliculasFavoritas.map(String)
        : [];
};

/**
 * Alterna un cine en la lista de favoritos del usuario.
 * @param cinemaId Identificador del cine.
 * @returns Lista actualizada de cines favoritos.
 */
const toggleFavoriteCinema = async (cinemaId: string): Promise<string[]> => {
    const { data } = await axios.post<{ cinesFavoritos: string[] }>(
        `${baseUrl}/favoritos/cines/${encodeURIComponent(cinemaId)}`,
        {},
        getAuthConfig(),
    );

    return Array.isArray(data.cinesFavoritos)
        ? data.cinesFavoritos.map(String)
        : [];
};

export default {
    getFavorites,
    toggleFavoriteMovie,
    toggleFavoriteCinema,
};
