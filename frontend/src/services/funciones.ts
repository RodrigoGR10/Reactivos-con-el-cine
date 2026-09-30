import type { Funcion } from "../types/types";

const baseUrl = "http://localhost:3001/funciones";

// Pide todas las funciones.
const getAll = () => {
    return fetch(baseUrl).then((response) => {
        if (!response.ok) {
            throw new Error("No se pudieron obtener las funciones");
        }

        return response.json() as Promise<Funcion[]>;
    });
};

// Obtiene las funciones de una película directamente desde el backend.
const getByPelicula = (peliculaId: number) => {
    return fetch(`${baseUrl}?peliculaId=${peliculaId}`).then((response) => {
        if (!response.ok) {
            throw new Error("No se pudieron obtener las funciones de la película");
        }

        return response.json() as Promise<Funcion[]>;
    });
};

export default {
    getAll,
    getByPelicula,
};