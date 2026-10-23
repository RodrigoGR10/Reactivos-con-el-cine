import cinesData from "./cines.json" with { type: "json" };
import { configureRequests } from "../http.ts";
import type { CinepolisCinema } from "./types.ts";

export const SITE = "https://cinepolis.com/cl";
export const BUY_SITE = "https://cinepolis.com/cl/horarios";
// Clave del cliente web publico; puede reemplazarse desde el entorno.
export const API_KEY = process.env.CINEPOLIS_API_KEY || "lQM6Mkvri1iHksKKCfpAiwGXq0YUZA7Nn6XAXRPr4i13LwXo";

export function purchaseUrl(movieId: string, cinemaId: string, sessionId: string): string {
  const url = new URL(`${SITE}/asientos`);
  url.search = new URLSearchParams({
    country: "cl", movie: movieId, cinema: cinemaId, selected: cinemaId, session: sessionId,
  }).toString();
  return url.href;
}

export const CINES_CINEPOLIS: CinepolisCinema[] = cinesData as CinepolisCinema[];

export async function initializeCinepolis(delayMs = 500): Promise<void> {
  configureRequests(delayMs);
}

export function listCinemasSync(): CinepolisCinema[] {
  return CINES_CINEPOLIS;
}
