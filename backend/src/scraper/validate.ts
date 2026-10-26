import type { ScrapeResult } from "./types.ts";

export function validarScrapeResult(
    data: unknown,
): asserts data is ScrapeResult {
    if (!data || typeof data !== "object") {
        throw new Error("El JSON no contiene un objeto de scraping válido.");
    }

    const result = data as Partial<ScrapeResult>;

    if (
        !Array.isArray(result.cines) ||
        !Array.isArray(result.peliculas) ||
        !Array.isArray(result.horarios) ||
        !Array.isArray(result.incidencias)
    ) {
        throw new Error(
            "El JSON debe contener cines, peliculas, horarios e incidencias como listas.",
        );
    }

    if (
        !result.meta ||
        typeof result.meta.origen !== "string" ||
        typeof result.meta.completo !== "boolean" ||
        typeof result.meta.desde !== "string" ||
        !Number.isInteger(result.meta.cinesSeleccionados) ||
        !Number.isInteger(result.meta.cinesProcesados)
    ) {
        throw new Error("Faltan metadatos obligatorios del scraping.");
    }

    if (
        !["cinemark", "cineplanet", "muvix", "cinestar"].includes(
            result.meta.origen,
        )
    ) {
        throw new Error(`Origen desconocido: ${result.meta.origen}.`);
    }
}
