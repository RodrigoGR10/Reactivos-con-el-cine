import axios from "axios";
import type { Funcion, Horario } from "../types/types";
import { API_BASE_URL } from "./apiConfig";

const baseUrl = `${API_BASE_URL}/funciones`;

const normalizarTarifa = (tarifa: Funcion): Funcion => ({
  ...tarifa,
  id: String(tarifa.id),
  peliculaId: String(tarifa.peliculaId),
  cineId: String(tarifa.cineId),
});

const normalizarHorario = (horario: Horario): Horario => ({
  ...horario,
  id: String(horario.id),
  peliculaId: String(horario.peliculaId),
  cineId: String(horario.cineId),
  tarifas: Array.isArray(horario.tarifas)
    ? horario.tarifas.map(normalizarTarifa)
    : [],
});

const getHorarios = async (peliculaId: string): Promise<Horario[]> => {
  const { data } = await axios.get<Horario[]>(`${baseUrl}/horarios`, { params: { peliculaId } });
  return data.map(normalizarHorario);
};

const getPrecios = async (peliculaId: string, cineId: string, fecha: string, signal?: AbortSignal): Promise<Horario[]> => {
  const { data } = await axios.get<{ horarios: Horario[] }>(`${baseUrl}/precios`, {
    params: { peliculaId, cineId, fecha }, signal, timeout: 90_000,
  });
  return data.horarios.map(normalizarHorario);
};

const getHorariosByCine = async (cineId: string): Promise<Horario[]> => {
  const { data } = await axios.get<Horario[]>(`${baseUrl}/horarios`, { params: { cineId } });
  return data.map(normalizarHorario);
};

const getButacas = async (peliculaId: string, cineId: string, fecha: string, signal?: AbortSignal): Promise<Horario[]> => {
  const { data } = await axios.get<{ horarios: Horario[] }>(`${baseUrl}/butacas`, {
    params: { peliculaId, cineId, fecha }, signal, timeout: 90_000,
  });
  return data.horarios.map(normalizarHorario);
};

export default {
  getHorarios,
  getHorariosByCine,
  getPrecios,
  getButacas,
};
