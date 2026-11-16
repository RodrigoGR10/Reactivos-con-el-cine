import { claveBasica } from "../../utils/titulos.ts";
import type { TmdbMovieResult } from "./types.ts";

const PUNTAJE_CONSULTA_VACIA = -100;
const PUNTOS_TITULO_EXACTO = 70;
const PUNTOS_TITULO_PARCIAL = 25;
const PENALIZACION_SIN_COINCIDENCIA = -30;
const LARGO_MINIMO_COINCIDENCIA_PARCIAL = 6;
const PUNTOS_ANIO_COINCIDE = 50;
const PENALIZACION_ANIO_DISTINTO = -100;

export function esCoincidenciaExacta(
    candidate: TmdbMovieResult,
    consulta: string,
): boolean {
    const consultaNorm = claveBasica(consulta);
    const tituloNorm = claveBasica(candidate.title || "");
    const originalNorm = claveBasica(candidate.original_title || "");

    return (
        consultaNorm.length > 0 &&
        (tituloNorm === consultaNorm || originalNorm === consultaNorm)
    );
}

function puntuarTitulo(candidate: TmdbMovieResult, consulta: string): number {
    if (esCoincidenciaExacta(candidate, consulta)) {
        return PUNTOS_TITULO_EXACTO;
    }

    const consultaNorm = claveBasica(consulta);
    const tituloNorm = claveBasica(candidate.title || "");
    const originalNorm = claveBasica(candidate.original_title || "");

    const contieneConsulta =
        consultaNorm.length >= LARGO_MINIMO_COINCIDENCIA_PARCIAL &&
        (tituloNorm.includes(consultaNorm) ||
            originalNorm.includes(consultaNorm));

    return contieneConsulta
        ? PUNTOS_TITULO_PARCIAL
        : PENALIZACION_SIN_COINCIDENCIA;
}

function puntuarAnio(
    candidate: TmdbMovieResult,
    anioExplicito?: number,
): number {
    if (anioExplicito === undefined) return 0;

    const anio = candidate.release_date
        ? Number(candidate.release_date.slice(0, 4))
        : undefined;

    return anio === anioExplicito
        ? PUNTOS_ANIO_COINCIDE
        : PENALIZACION_ANIO_DISTINTO;
}

export function puntuarCandidato(
    candidate: TmdbMovieResult,
    consulta: string,
    anioExplicito?: number,
): number {
    if (!claveBasica(consulta)) return PUNTAJE_CONSULTA_VACIA;

    return (
        puntuarTitulo(candidate, consulta) +
        puntuarAnio(candidate, anioExplicito)
    );
}
