import type { Pelicula } from "../types/types";

const baseUrl = "http://localhost:3001/peliculas";

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

        return response.json() as Promise<Pelicula>;
    });
};

export default {
    getAll,
    getById,
};