import type { ScheduleRow } from "./preciosFunciones/types.ts";
import { normalizarButacas } from "../scraper/butacas.ts";

export const CACHE_BUTACAS_MS = 2 * 60_000;

export function butacasPublicas(horario: ScheduleRow) {
  const compatible = horario.butacas_revision === horario.revision;
  const consultadasEn = compatible && horario.butacas_actualizadas_en ? new Date(horario.butacas_actualizadas_en).getTime() : 0;
  const vigentes = consultadasEn > 0 && Date.now() - consultadasEn < CACHE_BUTACAS_MS;
  const butacas = compatible && horario.butacas
    ? normalizarButacas(horario.butacas.disponibles, horario.butacas.total, horario.butacas.consultadasEn)
    : undefined;
  const error = horario.butacas_error_revision === horario.revision && !!horario.butacas_error_hasta && new Date(horario.butacas_error_hasta).getTime() > Date.now();
  return {
    estadoButacas: vigentes ? butacas ? "disponible" as const : "sin_datos" as const
      : error ? "error" as const : butacas ? "desactualizado" as const : "pendiente" as const,
    butacas: butacas ? {
      ...butacas,
      // No disponibles incluye reservas y bloqueos; no es un contador de entradas vendidas.
      porcentajeNoDisponible: butacas.total === undefined ? undefined : Math.round((1 - butacas.disponibles / butacas.total) * 1000) / 10,
    } : undefined,
    butacasReintentarEn: error ? new Date(horario.butacas_error_hasta!).toISOString() : undefined,
  };
}
