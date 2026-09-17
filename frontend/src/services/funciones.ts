import type { Funcion } from "../types/types";

const baseUrl = "http://localhost:3001/funciones";

// Pide todas las funciones sin filtrar.
const getAll = () => {
    return fetch(baseUrl).then((response) => {
        if (!response.ok) {
            throw new Error("No se pudieron obtener las funciones");
        }
        return response.json() as Promise<Funcion[]>;
    });
};

const getByPelicula = (peliculaId: string) => {
    return getAll().then((funciones) =>
        funciones.filter((funcion) => funcion.peliculaId === peliculaId)
    );
};

export default {
    getAll,
    getByPelicula,
};