import axios from "axios";
import { API_BASE_URL } from "./apiConfig";

export interface FuncionRecomendacion {
  id: number | string;
  fechaHora: string;
  peliculaId: number | string;
  peliculaTitulo: string;
  peliculaImagenUrl?: string | null;
  cineId: string;
  cineNombre: string;
}

const getFuncionesDisponibles = async (
  fecha: string,
  hora: string,
  cineIds: string[],
): Promise<FuncionRecomendacion[]> => {
  const { data } = await axios.get<FuncionRecomendacion[]>(`${API_BASE_URL}/recomendaciones`, {
    params: { fecha, hora, cineIds: cineIds.join(",") },
  });
  return data;
};

export default { getFuncionesDisponibles };
