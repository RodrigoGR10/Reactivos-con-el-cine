import { cineplanetData } from "./client.ts";
import { normalizarButacas } from "../butacas.ts";

interface DisponibilidadCineplanet {
  "available-seats"?: unknown;
  seatsTotal?: unknown;
}

export async function consultarButacasCineplanet(cineId: string, sesionId: string) {
  if (!/^\d+$/.test(cineId) || !/^\d+$/.test(sesionId)) throw new Error("Identidad de funcion de Cineplanet invalida.");
  const respuesta = await cineplanetData<DisponibilidadCineplanet>(`/api/sessionavailable/cinema/${cineId}/session/${sesionId}`);
  return normalizarButacas(respuesta["available-seats"], respuesta.seatsTotal, new Date().toISOString());
}
