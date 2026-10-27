import { ORIGENES } from "./types.ts";
import type {
    ScrapeResult,
    ScrapedCinema,
    ScrapedMovie,
    ScrapedSchedule,
} from "./types.ts";

function esObjeto(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function esFecha(value: unknown): value is string {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const date = new Date(`${value}T12:00:00.000Z`);
    return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
    );
}

function validarRegistros(
    registros: unknown[],
    tipo: "cine" | "pelicula" | "horario",
    origen: string,
) {
    for (const [i, value] of registros.entries()) {
        if (!esObjeto(value)) {
            throw new Error(`${tipo} ${i}: debe ser un objeto.`);
        }

        if (
            typeof value.id !== "string" ||
            !value.id.trim() ||
            value.origen !== origen ||
            typeof value.origenId !== "string" ||
            !value.origenId.trim() ||
            typeof value.extraidoEn !== "string" ||
            Number.isNaN(Date.parse(value.extraidoEn))
        ) {
            throw new Error(
                `${tipo} ${i}: identificadores, origen o fecha de extracción inválidos.`,
            );
        }

        if (tipo === "cine") {
            const cine = value as unknown as ScrapedCinema;
            if (
                typeof cine.nombre !== "string" ||
                typeof cine.comuna !== "string" ||
                typeof cine.ciudad !== "string"
            ) {
                throw new Error(
                    `Cine ${cine.id}: datos obligatorios inválidos.`,
                );
            }
        }

        if (tipo === "pelicula") {
            const pelicula = value as unknown as ScrapedMovie;
            if (
                typeof pelicula.titulo !== "string" ||
                typeof pelicula.duracion !== "number" ||
                typeof pelicula.genero !== "string"
            ) {
                throw new Error(
                    `Película ${pelicula.id}: datos obligatorios inválidos.`,
                );
            }
        }

        if (tipo === "horario") {
            const horario = value as unknown as ScrapedSchedule;
            if (
                typeof horario.peliculaId !== "string" ||
                typeof horario.cineId !== "string" ||
                typeof horario.sesionId !== "string" ||
                !horario.sesionId.trim() ||
                !esFecha(horario.fecha) ||
                !esFecha(horario.fechaCartelera) ||
                typeof horario.horario !== "string" ||
                typeof horario.revision !== "string" ||
                typeof horario.agotada !== "boolean"
            ) {
                throw new Error(
                    `Horario ${horario.id}: datos obligatorios inválidos.`,
                );
            }
        }
    }
}

export function validarScrapeResult(
    data: unknown,
): asserts data is ScrapeResult {
    if (!esObjeto(data)) {
        throw new Error("El JSON no contiene un objeto de scraping válido.");
    }

    if (
        !Array.isArray(data.cines) ||
        !Array.isArray(data.peliculas) ||
        !Array.isArray(data.horarios) ||
        !Array.isArray(data.incidencias) ||
        !Array.isArray(data.funciones)
    ) {
        throw new Error("El JSON no contiene todas las listas obligatorias.");
    }

    if (!esObjeto(data.meta)) {
        throw new Error("Faltan los metadatos del scraping.");
    }

    const meta = data.meta;

    if (
        typeof meta.origen !== "string" ||
        !ORIGENES.includes(meta.origen as (typeof ORIGENES)[number]) ||
        typeof meta.completo !== "boolean" ||
        !esFecha(meta.desde) ||
        !Number.isInteger(meta.cinesSeleccionados) ||
        !Number.isInteger(meta.cinesProcesados) ||
        (meta.cinesSeleccionados as number) < 0 ||
        (meta.cinesProcesados as number) < 0 ||
        (meta.cinesProcesados as number) >
            (meta.cinesSeleccionados as number) ||
        !Number.isInteger(meta.version) ||
        meta.version !== 1 ||
        (meta.dias !== null &&
            (!Number.isInteger(meta.dias) || (meta.dias as number) < 1)) ||
        (meta.limitePorCine !== null &&
            (!Number.isInteger(meta.limitePorCine) ||
                (meta.limitePorCine as number) < 1))
    ) {
        throw new Error(
            "Los metadatos del scraping son inválidos o inconsistentes.",
        );
    }

    validarRegistros(data.cines, "cine", meta.origen);
    validarRegistros(data.peliculas, "pelicula", meta.origen);
    validarRegistros(data.horarios, "horario", meta.origen);

    if (
        data.incidencias.some(
            (incidencia) =>
                !esObjeto(incidencia) ||
                typeof incidencia.etapa !== "string" ||
                typeof incidencia.mensaje !== "string",
        )
    ) {
        throw new Error("Hay incidencias con formato inválido.");
    }
}
