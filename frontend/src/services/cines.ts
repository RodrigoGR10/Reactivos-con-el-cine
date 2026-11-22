import axios from "axios";
import type { Cine } from "../types/types";
import { API_BASE_URL } from "./apiConfig";

const baseUrl = `${API_BASE_URL}/cines`;

/** Obtiene el directorio completo de cines. */
const getAll = async (): Promise<Cine[]> => {
    const { data } = await axios.get<Cine[]>(baseUrl);
    return data;
};

/**
 * Busca un cine por su identificador.
 * @param id Identificador del cine.
 * @returns Datos de ubicación e información del cine.
 */
const getById = async (id: string): Promise<Cine> => {
    const { data } = await axios.get<Cine>(`${baseUrl}/${id}`);
    return data;
};

export default {
    getAll,
    getById,
};
