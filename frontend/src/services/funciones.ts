import axios from "axios";
import type { Horario } from "../types/types";
import { API_BASE_URL } from "./apiConfig";

const baseUrl = `${API_BASE_URL}/funciones`;

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

const getHorariosByCine = async (cineId: string): Promise<Horario[]> => {
  const { data } = await axios.get<Horario[]>(`${baseUrl}/horarios`, { params: { cineId } });
  return data;
};

export default {
  getHorarios,
  getHorariosByCine,
  getPrecios,
};
