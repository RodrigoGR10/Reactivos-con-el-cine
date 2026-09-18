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

// Obtiene las funciones de una película.
const getByPelicula = (peliculaId: number) => {
    return getAll().then((funciones) => {
        return funciones.filter(
            (funcion) => funcion.peliculaId === peliculaId
        );
    });
};

export default {
    getAll,
    getByPelicula,
};