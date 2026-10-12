import { cinemarkData } from "./client.ts";
import type { RawCinema } from "./types.ts";

export async function listCinemas(): Promise<RawCinema[]> {
  const cinemas = await cinemarkData<RawCinema[]>("/cinema/theaters", { limit: String(Number.MAX_SAFE_INTEGER) });
  if (!Array.isArray(cinemas) || !cinemas.length) throw new Error("Cinemark no devolvio cines.");
  if (new Set(cinemas.map((cinema) => String(cinema.id))).size !== cinemas.length) throw new Error("Cinemark devolvio cines duplicados.");
  return cinemas;
}
