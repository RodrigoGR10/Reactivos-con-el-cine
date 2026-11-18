import axios from "axios";
import type { Cine } from "../types/types";
import { API_BASE_URL } from "./apiConfig";

const baseUrl = `${API_BASE_URL}/cines`;

const getAll = async (signal?: AbortSignal): Promise<Cine[]> => {
  const { data } = await axios.get<Cine[]>(baseUrl, { signal });
  return data;
};

const getById = async (id: string): Promise<Cine> => {
  const { data } = await axios.get<Cine>(`${baseUrl}/${id}`);
  return data;
};

export default {
  getAll,
  getById,
};
