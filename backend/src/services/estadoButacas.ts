import type { Horario } from "../models/horario.ts";
import { normalizarButacas } from "../scraper/butacas.ts";

export const CACHE_BUTACAS_MS = 2 * 60_000;

export function butacasPublicas(horario: Horario) {
  const compatible = horario.butacasRevision === horario.revision;
  const consultadasEn = compatible ? horario.butacasActualizadasEn?.getTime() ?? 0 : 0;
  const vigentes = consultadasEn > 0 && Date.now() - consultadasEn < CACHE_BUTACAS_MS;
  const butacas = compatible && horario.butacas
    ? normalizarButacas(horario.butacas.disponibles, horario.butacas.total, horario.butacas.consultadasEn)
    : undefined;
  const error = horario.butacasErrorRevision === horario.revision && (horario.butacasErrorHasta?.getTime() ?? 0) > Date.now();
  return {
    estadoButacas: vigentes ? butacas ? "disponible" as const : "sin_datos" as const
      : error ? "error" as const : butacas ? "desactualizado" as const : "pendiente" as const,
    butacas: butacas ? {
      ...butacas,
      // No disponibles incluye reservas y bloqueos; no es un contador de entradas vendidas.
      porcentajeNoDisponible: butacas.total === undefined ? undefined : Math.round((1 - butacas.disponibles / butacas.total) * 1000) / 10,
    } : undefined,
    butacasReintentarEn: error ? horario.butacasErrorHasta?.toISOString() : undefined,
  };
}
