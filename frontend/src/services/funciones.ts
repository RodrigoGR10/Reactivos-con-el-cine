import axios from "axios";
import type { Funcion, Horario } from "../types/types";
import { leerNdjsonStream } from "../utils/ndjsonStream";
import { API_BASE_URL } from "./apiConfig";

export type EventoDetalleStream =
    | { tipo: "precio"; horario: Horario }
    | { tipo: "butaca"; horario: Horario }
    | { tipo: "fin"; falloPrecios: boolean; falloButacas: boolean };

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
    const { data } = await axios.get<Horario[]>(`${baseUrl}/horarios`, {
        params: { peliculaId },
    });
    return data.map(normalizarHorario);
};

const getPrecios = async (
    peliculaId: string,
    cineId: string,
    fecha: string,
    signal?: AbortSignal,
): Promise<Horario[]> => {
    const { data } = await axios.get<{ horarios: Horario[] }>(
        `${baseUrl}/precios`,
        {
            params: { peliculaId, cineId, fecha },
            signal,
            timeout: 90_000,
        },
    );
    return data.horarios.map(normalizarHorario);
};

const getHorariosByCine = async (cineId: string): Promise<Horario[]> => {
    const { data } = await axios.get<Horario[]>(`${baseUrl}/horarios`, {
        params: { cineId },
    });
    return data.map(normalizarHorario);
};

const getButacas = async (
    peliculaId: string,
    cineId: string,
    fecha: string,
    signal?: AbortSignal,
): Promise<Horario[]> => {
    const { data } = await axios.get<{ horarios: Horario[] }>(
        `${baseUrl}/butacas`,
        {
            params: { peliculaId, cineId, fecha },
            signal,
            timeout: 90_000,
        },
    );
    return data.horarios.map(normalizarHorario);
};

const streamDetalle = async (
    peliculaId: string,
    cineId: string,
    fecha: string,
    onEvento: (evento: EventoDetalleStream) => void,
    signal?: AbortSignal,
): Promise<void> => {
    const params = new URLSearchParams({ peliculaId, cineId, fecha });
    await leerNdjsonStream<EventoDetalleStream>(
        `${baseUrl}/detalle-stream?${params}`,
        {
            signal,
            timeoutMs: 90_000,
            onItem: (evento) => {
                if (evento.tipo === "precio" || evento.tipo === "butaca") {
                    onEvento({
                        tipo: evento.tipo,
                        horario: normalizarHorario(evento.horario),
                    });
                } else {
                    onEvento(evento);
                }
            },
        },
    );
};

export default {
    getHorarios,
    getHorariosByCine,
    getPrecios,
    getButacas,
    streamDetalle,
};
