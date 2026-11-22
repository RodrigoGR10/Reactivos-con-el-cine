import axios from "axios";
import type { Funcion, Horario } from "../types/types";
import { leerNdjsonStream } from "../utils/ndjsonStream";
import { API_BASE_URL } from "./apiConfig";

/**
 * Evento incremental de precios, butacas o cierre del flujo de detalle.
 */
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

/**
 * Obtiene los horarios disponibles para una película.
 * @param peliculaId Identificador de la película.
 * @returns Horarios normalizados con sus tarifas asociadas.
 */
const getHorarios = async (peliculaId: string): Promise<Horario[]> => {
    const { data } = await axios.get<Horario[]>(`${baseUrl}/horarios`, {
        params: { peliculaId },
    });
    return data.map(normalizarHorario);
};

/**
 * Solicita precios actuales para las funciones de una película en un cine y día.
 * @param peliculaId Identificador de la película.
 * @param cineId Identificador del cine.
 * @param fecha Día de cartelera en formato `AAAA-MM-DD`.
 * @param signal Señal opcional para cancelar la consulta.
 * @returns Horarios con los estados y tarifas informados por la API.
 */
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

/**
 * Obtiene los horarios programados por un cine, para todas sus películas.
 * @param cineId Identificador del cine.
 * @returns Horarios asociados a ese cine.
 */
const getHorariosByCine = async (cineId: string): Promise<Horario[]> => {
    const { data } = await axios.get<Horario[]>(`${baseUrl}/horarios`, {
        params: { cineId },
    });
    return data.map(normalizarHorario);
};

/**
 * Solicita la disponibilidad de butacas para una película, cine y fecha.
 * @param peliculaId Identificador de la película.
 * @param cineId Identificador del cine.
 * @param fecha Día de cartelera en formato `AAAA-MM-DD`.
 * @param signal Señal opcional para cancelar la consulta.
 * @returns Horarios con el estado y cantidad de butacas disponibles.
 */
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

/**
 * Consume el flujo NDJSON de precios y butacas y entrega cada evento al callback.
 * @param peliculaId Identificador de la película.
 * @param cineId Identificador del cine.
 * @param fecha Día de cartelera en formato `AAAA-MM-DD`.
 * @param onEvento Función llamada por cada resultado parcial o evento de cierre.
 * @param signal Señal opcional para cancelar el flujo.
 */
/** Eventos incrementales enviados durante la consulta de precios y butacas. */
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
