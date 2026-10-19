import type { ScrapedSchedule } from "./types.ts";

export { localNow } from "../utils/localNow.ts";

export function isDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

export function fechaDeEstreno(value?: string): string | undefined {
  // Las cadenas publican el dia de estreno: no convertir la medianoche UTC a Chile.
  const fecha = typeof value === "string" ? value.slice(0, 10) : undefined;
  return fecha && isDate(fecha) ? fecha : undefined;
}

export function scheduleRevision(schedule: Pick<ScrapedSchedule, "peliculaId" | "cineId" | "sesionId" | "fecha" | "fechaCartelera" | "horario" | "formatoResumen" | "idioma" | "sala" | "urlCompra">): string {
  return JSON.stringify([
    schedule.peliculaId, schedule.cineId, schedule.sesionId,
    schedule.fecha, schedule.fechaCartelera, schedule.horario,
    schedule.formatoResumen, schedule.idioma, schedule.sala,
    ...(schedule.urlCompra ? [schedule.urlCompra] : []),
  ]);
}
