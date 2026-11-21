import type { Pelicula } from "../../types/types.ts";
import {
    PESO_CINES_PREVENTA,
    PESO_FAVORITOS_PREVENTA,
    PESO_POPULARIDAD_PREVENTA,
    PRIOR_RATING_BAYESIANO,
    PRIOR_VOTOS_BAYESIANO,
} from "./config.ts";
import { totalFavoritos } from "./predicates.ts";

export function puntajeBayesiano(pelicula: Pelicula): number {
    const rating = pelicula.calificacionTmdb ?? 0;
    const votos = pelicula.votosTmdb ?? 0;
    return (
        (votos / (votos + PRIOR_VOTOS_BAYESIANO)) * rating +
        (PRIOR_VOTOS_BAYESIANO / (votos + PRIOR_VOTOS_BAYESIANO)) *
            PRIOR_RATING_BAYESIANO
    );
}

export function puntajeReestreno(pelicula: Pelicula): number {
    const votos = pelicula.votosTmdb ?? 0;
    const rating = pelicula.calificacionTmdb ?? 6;
    const popularidad = Math.min(pelicula.popularidadTmdb ?? 0, 40);
    return (
        (votos > 0 ? Math.log10(votos + 1) * rating : 0) + popularidad * 0.25
    );
}

export function puntajeTendencia(pelicula: Pelicula): number {
    return (pelicula.popularidadTmdb ?? 0) + (pelicula.totalCines ?? 0) * 3;
}

export interface ReferenciaPreventa {
    maxLogFavoritos: number;
    maxCines: number;
    maxLogPopularidad: number;
}

export function calcularReferenciaPreventa(
    catalogo: readonly Pelicula[],
): ReferenciaPreventa {
    let maxFavs = 0;
    let maxCines = 0;
    let maxPop = 0;

    for (const pelicula of catalogo) {
        maxFavs = Math.max(maxFavs, totalFavoritos(pelicula) ?? 0);
        maxCines = Math.max(maxCines, pelicula.totalCines ?? 0);
        maxPop = Math.max(maxPop, pelicula.popularidadTmdb ?? 0);
    }

    return {
        maxLogFavoritos: Math.log1p(Math.max(maxFavs, 1)),
        maxCines,
        maxLogPopularidad: Math.log1p(maxPop),
    };
}

export function puntajePreventa(
    pelicula: Pelicula,
    ref: ReferenciaPreventa,
): number {
    const normFavs =
        ref.maxLogFavoritos > 0
            ? Math.log1p(totalFavoritos(pelicula) ?? 0) / ref.maxLogFavoritos
            : 0;
    const normPop =
        ref.maxLogPopularidad > 0
            ? Math.log1p(pelicula.popularidadTmdb ?? 0) / ref.maxLogPopularidad
            : 0;

    if (ref.maxCines > 0) {
        const normCines = (pelicula.totalCines ?? 0) / ref.maxCines;
        return (
            1000 *
            (PESO_FAVORITOS_PREVENTA * normFavs +
                PESO_CINES_PREVENTA * normCines +
                PESO_POPULARIDAD_PREVENTA * normPop)
        );
    }

    const pesoDisponible = PESO_FAVORITOS_PREVENTA + PESO_POPULARIDAD_PREVENTA;
    return (
        1000 *
        ((PESO_FAVORITOS_PREVENTA / pesoDisponible) * normFavs +
            (PESO_POPULARIDAD_PREVENTA / pesoDisponible) * normPop)
    );
}
