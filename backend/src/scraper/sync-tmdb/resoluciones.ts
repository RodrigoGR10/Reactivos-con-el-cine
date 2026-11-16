import { resolucionesManuales } from "../resoluciones-tmdb.ts";
import type { ResolucionManual } from "../resoluciones-tmdb.ts";
import type { MovieRow } from "./types.ts";

export interface IndiceResoluciones {
    porId: Map<number, ResolucionManual>;
    invalidas: Map<number, string>;
}

const MOTIVO_DUPLICADA = "Hay más de una resolución manual para esta película.";
const MOTIVO_INVALIDA =
    "La resolución manual tiene un ID inexistente o inválido, o no tiene un motivo.";

function esIdValido(valor: number): boolean {
    return Number.isSafeInteger(valor) && valor > 0;
}

export function indexarResoluciones(movies: MovieRow[]): IndiceResoluciones {
    const idsPendientes = new Set(movies.map((movie) => movie.id));
    const porId = new Map<number, ResolucionManual>();
    const invalidas = new Map<number, string>();

    for (const resolucion of resolucionesManuales) {
        const { peliculaId, tmdbId, motivo } = resolucion;

        if (!esIdValido(peliculaId)) {
            console.error(
                `Resolución manual con peliculaId inválido: ${peliculaId}`,
            );
            continue;
        }

        if (porId.has(peliculaId)) {
            invalidas.set(peliculaId, MOTIVO_DUPLICADA);
            continue;
        }

        porId.set(peliculaId, resolucion);

        const tmdbIdInvalido = tmdbId !== null && !esIdValido(tmdbId);
        const sinMotivo = typeof motivo !== "string" || !motivo.trim();

        if (!idsPendientes.has(peliculaId) || tmdbIdInvalido || sinMotivo) {
            invalidas.set(peliculaId, MOTIVO_INVALIDA);
        }
    }

    return { porId, invalidas };
}
