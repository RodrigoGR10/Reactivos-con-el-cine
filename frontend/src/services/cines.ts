import axios from "axios";
import type { Cine } from "../types/types";
import { API_BASE_URL } from "./apiConfig";

const baseUrl = `${API_BASE_URL}/cines`;

const getAll = async (): Promise<Cine[]> => {
  const { data } = await axios.get<Cine[]>(baseUrl);
  return data;
};

export default {
  getAll,
};
