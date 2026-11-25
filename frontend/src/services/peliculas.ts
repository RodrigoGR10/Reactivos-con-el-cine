import axios from "axios";
import type { Pelicula } from "../types/types";
import { API_BASE_URL } from "./apiConfig";

const baseUrl = `${API_BASE_URL}/peliculas`;

const normalizarPelicula = (pelicula: Pelicula): Pelicula => ({
    ...pelicula,
    id: String(pelicula.id),
});

/** Obtiene todas las películas disponibles en el catálogo. */
const getAll = async (): Promise<Pelicula[]> => {
    const { data } = await axios.get<Pelicula[]>(baseUrl);
    return data.map(normalizarPelicula);
};

/**
 * Obtiene las películas actualmente incluidas en cartelera.
 * @param signal Señal opcional para cancelar la petición al cambiar de vista.
 * @returns Películas con sus identificadores normalizados como texto.
 */
const getCartelera = async (signal?: AbortSignal): Promise<Pelicula[]> => {
    const { data } = await axios.get<Pelicula[]>(baseUrl, {
        params: { cartelera: true },
        signal,
    });
    return data.map(normalizarPelicula);
};

/**
 * Busca una película por su identificador.
 * @param id Identificador de la película.
 * @returns Datos de la película.
 */
const getById = async (id: string): Promise<Pelicula> => {
    const { data } = await axios.get<Pelicula>(`${baseUrl}/${id}`);
    return normalizarPelicula(data);
};

export default {
    getAll,
    getCartelera,
    getById,
};
