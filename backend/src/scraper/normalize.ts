import type { ScrapedSchedule } from "./types.ts";

export { localNow } from "../utils/localNow.ts";

/**
 * Valida si el texto recibido representa una fecha reconocida por el scraper.
 * @param value Valor que se valida o normaliza.
 * @returns Resultado que indica si se cumple la condición evaluada.
 */
export function isDate(value: string): boolean {
    return (
        /^(?!0000)\d{4}-\d{2}-\d{2}$/.test(value) &&
        !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
        new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
    );
}

/**
 * Normaliza una fecha de estreno cuando la fuente entrega un valor válido.
 * @param value Valor que se valida o normaliza.
 */
export function fechaDeEstreno(value?: string): string | undefined {
    // Las cadenas publican el dia de estreno: no convertir la medianoche UTC a Chile.
    const fecha = typeof value === "string" ? value.slice(0, 10) : undefined;
    return fecha && isDate(fecha) ? fecha : undefined;
}

/**
 * Calcula una clave de revisión para identificar cambios en una función.
 * @param schedule Datos del horario o función que se procesa.
 * @returns Texto normalizado o generado por la operación.
 */
export function scheduleRevision(
    schedule: Pick<
        ScrapedSchedule,
        | "peliculaId"
        | "cineId"
        | "sesionId"
        | "fecha"
        | "fechaCartelera"
        | "horario"
        | "formatoResumen"
        | "idioma"
        | "sala"
        | "urlCompra"
    >,
): string {
    return JSON.stringify([
        schedule.peliculaId,
        schedule.cineId,
        schedule.sesionId,
        schedule.fecha,
        schedule.fechaCartelera,
        schedule.horario,
        schedule.formatoResumen,
        schedule.idioma,
        schedule.sala,
        ...(schedule.urlCompra ? [schedule.urlCompra] : []),
    ]);
}
