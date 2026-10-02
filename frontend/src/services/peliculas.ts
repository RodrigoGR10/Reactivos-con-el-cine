import type { Pelicula } from "../types/types";
import { API_BASE_URL } from "./apiConfig";

const baseUrl = `${API_BASE_URL}/peliculas`;

const getAll = () => {
  return fetch(baseUrl).then((response) => {
    if (!response.ok) {
      throw new Error("No se pudieron obtener las películas");
    }

    return response.json() as Promise<Pelicula[]>;
  });
};

const getById = (id: string) => {
  return fetch(`${baseUrl}/${id}`).then((response) => {
    if (!response.ok) {
      throw new Error("No se pudo obtener la película");
    }

    return response.json().then((data) => ({
      ...data,
      id: data.id,
    })) as Promise<Pelicula>;
  });
};

export default {
  getAll,
  getById,
};
