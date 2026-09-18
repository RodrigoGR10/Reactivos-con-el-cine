import type { Pelicula } from "../types/types";

const baseUrl = "http://localhost:3001/peliculas";

// Pide una sola pelicula por su id, ej: GET http://localhost:3001/peliculas/1
const getById = (id: string) => {
    return fetch(`${baseUrl}/${id}`).then((response) => {
        if (!response.ok) {
            throw new Error("No se pudo obtener la película");
        }
        return response.json() as Promise<Pelicula>;
    });
};

export default {
    getById,
};
