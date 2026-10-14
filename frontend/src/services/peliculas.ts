import axios from "axios";
import type { Pelicula } from "../types/types";
import { API_BASE_URL } from "./apiConfig";

const baseUrl = `${API_BASE_URL}/peliculas`;

const getAll = async (): Promise<Pelicula[]> => {
  const { data } = await axios.get<Pelicula[]>(baseUrl);

  return data;
};

const getById = async (id: string): Promise<Pelicula> => {
  const { data } = await axios.get<Pelicula>(`${baseUrl}/${id}`);

  return data;
};

export default {
  getAll,
  getById,
};
