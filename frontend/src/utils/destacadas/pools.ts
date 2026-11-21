import type { Pelicula } from "../../types/types.ts";
import {
    CINES_MIN_EN_MAS_SALAS,
    DIAS_ESTRENO_RECIENTE,
    DIAS_MAX_ESTRENO_ORIGINAL_PARA_NOVEDAD,
    MIN_FAVORITOS_PARA_DESTACAR,
    PUNTAJE_MIN_PREVENTA_ESPERADA,
    RATING_MIN_MEJOR_VALORADA,
    VOTOS_MIN_MEJOR_VALORADA,
} from "./config.ts";
import { diasDesde, esReestreno } from "./dates.ts";
import {
    compararBase,
    compararPresencia,
    esCartelera,
    tieneBannerHero,
    totalFavoritos,
} from "./predicates.ts";
import {
    calcularReferenciaPreventa,
    puntajeBayesiano,
    puntajePreventa,
    puntajeReestreno,
    puntajeTendencia,
} from "./scoring.ts";
import { ESTADO_PREVENTA, type CategoriaPoolId } from "./types.ts";

type ConstructorPool = (
    peliculas: readonly Pelicula[],
    hoy: string,
) => Pelicula[];

interface PoolFavoritas {
    candidatas: Pelicula[];
    empateEnTope: boolean;
}

export function poolFavoritas(peliculas: readonly Pelicula[]): PoolFavoritas {
    const candidatas = peliculas
        .filter(
            (p) =>
                esCartelera(p) &&
                (totalFavoritos(p) ?? 0) >= MIN_FAVORITOS_PARA_DESTACAR,
        )
        .sort(
            (a, b) =>
                (totalFavoritos(b) ?? 0) - (totalFavoritos(a) ?? 0) ||
                Number(tieneBannerHero(b)) - Number(tieneBannerHero(a)) ||
                compararPresencia(a, b) ||
                compararBase(a, b),
        );

    if (candidatas.length === 0) {
        return { candidatas: [], empateEnTope: false };
    }

    const maxFavs = totalFavoritos(candidatas[0]) ?? 0;
    const enPrimerLugar = candidatas.filter(
        (p) => (totalFavoritos(p) ?? 0) === maxFavs,
    );
    if (enPrimerLugar.length > 1) {
        return { candidatas: enPrimerLugar, empateEnTope: true };
    }
    return { candidatas: enPrimerLugar.slice(0, 1), empateEnTope: false };
}

const construirPoolEstrenosRecientes: ConstructorPool = (peliculas, hoy) =>
    peliculas
        .filter((p) => {
            if (!esCartelera(p) || !tieneBannerHero(p)) return false;
            const dias = diasDesde(p.fechaEstreno, hoy);
            if (dias === null || dias < 0 || dias > DIAS_ESTRENO_RECIENTE) {
                return false;
            }
            const diasOriginal = diasDesde(p.fechaEstrenoTmdb, hoy);
            if (
                diasOriginal !== null &&
                diasOriginal > DIAS_MAX_ESTRENO_ORIGINAL_PARA_NOVEDAD
            ) {
                return false;
            }
            if (p.totalCines !== undefined || p.popularidadTmdb !== undefined) {
                return (
                    (p.totalCines ?? 0) >= 5 || (p.popularidadTmdb ?? 0) >= 10
                );
            }
            return true;
        })
        .sort((a, b) => compararPresencia(a, b) || compararBase(a, b));

const construirPoolMejorValoradas: ConstructorPool = (peliculas) =>
    peliculas
        .filter(
            (p) =>
                esCartelera(p) &&
                tieneBannerHero(p) &&
                typeof p.calificacionTmdb === "number" &&
                p.calificacionTmdb >= RATING_MIN_MEJOR_VALORADA &&
                typeof p.votosTmdb === "number" &&
                p.votosTmdb >= VOTOS_MIN_MEJOR_VALORADA,
        )
        .sort(
            (a, b) =>
                puntajeBayesiano(b) - puntajeBayesiano(a) ||
                compararPresencia(a, b) ||
                compararBase(a, b),
        );

const construirPoolEnMasSalas: ConstructorPool = (peliculas) =>
    peliculas
        .filter(
            (p) =>
                esCartelera(p) &&
                tieneBannerHero(p) &&
                (p.totalCines === undefined ||
                    p.totalCines >= CINES_MIN_EN_MAS_SALAS),
        )
        .sort(
            (a, b) =>
                puntajeTendencia(b) - puntajeTendencia(a) ||
                compararPresencia(a, b) ||
                compararBase(a, b),
        );

const construirPoolPreventasEsperadas: ConstructorPool = (peliculas) => {
    const ref = calcularReferenciaPreventa(peliculas);
    return peliculas
        .filter((p) => {
            if (p.estadoEstreno !== ESTADO_PREVENTA || !tieneBannerHero(p)) {
                return false;
            }
            if (ref.maxCines > 0) {
                return puntajePreventa(p, ref) >= PUNTAJE_MIN_PREVENTA_ESPERADA;
            }
            return (
                (totalFavoritos(p) ?? 0) > 0 ||
                (p.popularidadTmdb ?? 0) >= 10 ||
                (p.totalCines ?? 0) >= 25
            );
        })
        .sort(
            (a, b) =>
                puntajePreventa(b, ref) - puntajePreventa(a, ref) ||
                (a.fechaEstreno ?? "9999").localeCompare(
                    b.fechaEstreno ?? "9999",
                ) ||
                compararBase(a, b),
        );
};

const construirPoolReestrenos: ConstructorPool = (peliculas, hoy) =>
    peliculas
        .filter(
            (p) => esCartelera(p) && tieneBannerHero(p) && esReestreno(p, hoy),
        )
        .sort(
            (a, b) =>
                puntajeReestreno(b) - puntajeReestreno(a) ||
                compararPresencia(a, b) ||
                compararBase(a, b),
        );

const CONSTRUCTORES_POOL: Record<CategoriaPoolId, ConstructorPool> = {
    favoritas: (peliculas) => poolFavoritas(peliculas).candidatas,
    estrenos_recientes: construirPoolEstrenosRecientes,
    mejor_valoradas: construirPoolMejorValoradas,
    en_mas_salas: construirPoolEnMasSalas,
    preventas_esperadas: construirPoolPreventasEsperadas,
    reestrenos: construirPoolReestrenos,
};

export function obtenerPoolCategoria(
    categoria: CategoriaPoolId,
    peliculas: readonly Pelicula[],
    hoy: string,
): Pelicula[] {
    return CONSTRUCTORES_POOL[categoria](peliculas, hoy);
}
