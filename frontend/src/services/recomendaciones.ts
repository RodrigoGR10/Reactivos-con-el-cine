import axios from "axios";
import { API_BASE_URL } from "./apiConfig";

/** Forma de una función devuelta por el endpoint de recomendaciones. */
export interface FuncionRecomendacion {
    id: number | string;
    fechaHora: string;
    peliculaId: number | string;
    peliculaTitulo: string;
    peliculaImagenUrl?: string | null;
    cineId: string;
    cineNombre: string;
    formato?: string | null;
    idioma?: string | null;
}

/**
 * Busca funciones que comiencen dentro del rango posterior a la hora indicada.
 * @param fecha Día de búsqueda en formato `AAAA-MM-DD`.
 * @param hora Hora mínima en formato `HH:mm`.
 * @param cineIds Identificadores de uno o más cines de la zona elegida.
 * @returns Funciones elegibles con el resumen de película y cine.
 */
const getFuncionesDisponibles = async (
    fecha: string,
    hora: string,
    cineIds: string[],
): Promise<FuncionRecomendacion[]> => {
    const { data } = await axios.get<FuncionRecomendacion[]>(
        `${API_BASE_URL}/recomendaciones`,
        {
            params: { fecha, hora, cineIds: cineIds.join(",") },
        },
    );
    return data;
};

export default { getFuncionesDisponibles };
