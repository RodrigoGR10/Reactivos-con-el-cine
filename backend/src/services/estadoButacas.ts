import { normalizarButacas } from "../scraper/butacas.ts";
import type { ScheduleRow } from "./preciosFunciones/types.ts";

export const CACHE_BUTACAS_MS = 2 * 60_000;

export function butacasPublicas(row: ScheduleRow) {
    const compatible = row.butacas_revision === row.revision;
    const consultadasEn = compatible && row.butacas_actualizadas_en
        ? new Date(row.butacas_actualizadas_en).getTime()
        : 0;
    const vigentes = consultadasEn > 0 && Date.now() - consultadasEn < CACHE_BUTACAS_MS;
    const butacas =
        compatible &&
        row.butacas_disponibles !== null &&
        row.butacas_consultadas_en !== null
            ? normalizarButacas(
                  row.butacas_disponibles,
                  row.butacas_total ?? undefined,
                  new Date(row.butacas_consultadas_en).toISOString(),
              )
            : undefined;
    const error =
        row.butacas_error_revision === row.revision &&
        row.butacas_error_hasta !== null &&
        new Date(row.butacas_error_hasta).getTime() > Date.now();

    return {
        estadoButacas: vigentes
            ? butacas
                ? ("disponible" as const)
                : ("sin_datos" as const)
            : error
              ? ("error" as const)
              : butacas
                ? ("desactualizado" as const)
                : ("pendiente" as const),
        butacas: butacas
            ? {
                  ...butacas,
                  // No disponibles incluye reservas y bloqueos; no es un contador de entradas vendidas.
                  porcentajeNoDisponible:
                      butacas.total === undefined
                          ? undefined
                          : Math.round((1 - butacas.disponibles / butacas.total) * 1000) / 10,
              }
            : undefined,
        butacasReintentarEn:
            error && row.butacas_error_hasta
                ? new Date(row.butacas_error_hasta).toISOString()
                : undefined,
    };
}
