import axios from "axios";
import type { Funcion } from "../types/types";
import { API_BASE_URL } from "./apiConfig";

const baseUrl = `${API_BASE_URL}/funciones`;

// Pide todas las funciones.
const getAll = async (): Promise<Funcion[]> => {
  const { data } = await axios.get<Funcion[]>(baseUrl);

  return data;
};

// Obtiene las funciones de una película directamente desde el backend.
const getByPelicula = async (peliculaId: string): Promise<Funcion[]> => {
  const { data } = await axios.get<Funcion[]>(
    `${baseUrl}?peliculaId=${peliculaId}`,
  );

  return data;
};

export default {
  getAll,
  getByPelicula,
};
