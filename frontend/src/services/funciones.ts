import axios from "axios";
import type { Funcion, Horario } from "../types/types";
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

const getHorarios = async (peliculaId: string): Promise<Horario[]> => {
  const { data } = await axios.get<Horario[]>(`${baseUrl}/horarios`, { params: { peliculaId } });
  return data;
};

const getPrecios = async (peliculaId: string, cineId: string, fecha: string, signal?: AbortSignal): Promise<Horario[]> => {
  const { data } = await axios.get<{ horarios: Horario[] }>(`${baseUrl}/precios`, {
    params: { peliculaId, cineId, fecha }, signal, timeout: 90_000,
  });
  return data.horarios;
};

export default {
  getAll,
  getByPelicula,
  getHorarios,
  getPrecios,
};
