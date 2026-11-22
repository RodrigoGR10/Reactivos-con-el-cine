import cinesData from "./cines.json" with { type: "json" };
import { configureRequests } from "../http.ts";
import type { CinepolisCinema } from "./types.ts";

export const SITE = "https://cinepolis.com/cl";
export const BUY_SITE = "https://cinepolis.com/cl/horarios";
// Clave del cliente web publico; puede reemplazarse desde el entorno.
export const API_KEY =
    process.env.CINEPOLIS_API_KEY ||
    "lQM6Mkvri1iHksKKCfpAiwGXq0YUZA7Nn6XAXRPr4i13LwXo";

/**
 * Construye el enlace de compra asociado a la función de la cadena indicada.
 * @param movieId Identificador de la película.
 * @param cinemaId Identificador del cine.
 * @param sessionId Identificador del registro relacionado.
 * @returns Texto normalizado o generado por la operación.
 */
export function purchaseUrl(
    movieId: string,
    cinemaId: string,
    sessionId: string,
): string {
    const url = new URL(`${SITE}/asientos`);
    url.search = new URLSearchParams({
        country: "cl",
        movie: movieId,
        cinema: cinemaId,
        selected: cinemaId,
        session: sessionId,
    }).toString();
    return url.href;
}

export const CINES_CINEPOLIS: CinepolisCinema[] =
    cinesData as CinepolisCinema[];

/**
 * Prepara las consultas al catálogo de Cinépolis y aplica el intervalo configurado.
 * @param delayMs Tiempo de espera entre solicitudes, en milisegundos.
 */
export async function initializeCinepolis(delayMs = 500): Promise<void> {
    configureRequests(delayMs);
}

/**
 * Devuelve la lista local de cines de Cinépolis sin hacer una solicitud de red.
 * @returns Lista de resultados encontrados o transformados.
 */
export function listCinemasSync(): CinepolisCinema[] {
    return CINES_CINEPOLIS;
}
