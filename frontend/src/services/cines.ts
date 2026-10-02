import type { Cine } from "../types/types";
import { API_BASE_URL } from "./apiConfig";

const baseUrl = `${API_BASE_URL}/cines`;

const getAll = () => {
  return fetch(baseUrl).then((response) => {
    if (!response.ok) {
      throw new Error("No se pudieron obtener los cines");
    }

    return response.json() as Promise<Cine[]>;
  });
};

export default {
  getAll,
};
