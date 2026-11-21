import type { Pelicula } from "../types/types.ts";
import { CONFIG_CUPOS_DESTACADAS } from "./destacadas/config.ts";
import { fechaHoySantiago } from "./fechaSantiago.ts";
import { complementoPara, generarEtiqueta } from "./destacadas/labels.ts";
import { obtenerPoolCategoria, poolFavoritas } from "./destacadas/pools.ts";
import {
    compararBase,
    compararPresencia,
    esConcierto,
    tieneBannerHero,
} from "./destacadas/predicates.ts";
import {
    elegirCandidata,
    elegirPonderada,
    mezclarCarrusel,
} from "./destacadas/sampling.ts";
import {
    ESTADO_PREVENTA,
    ESTADO_PROXIMAMENTE,
    LIMITE_DESTACADAS,
    type CategoriaPoolId,
    type OpcionesSeleccionDestacadas,
    type PeliculaDestacadaSeleccionada,
    type ReglaCupoCategoria,
} from "./destacadas/types.ts";

export type {
    CategoriaDestacada,
    ComplementoEtiquetaDestacada,
    EstrategiaSeleccion,
    OpcionesSeleccionDestacadas,
    PeliculaDestacadaSeleccionada,
    ReglaCupoCategoria,
} from "./destacadas/types.ts";
export { CONFIG_CUPOS_DESTACADAS } from "./destacadas/config.ts";
export { fechaHoySantiago } from "./fechaSantiago.ts";
export {
    esConcierto,
    tieneBannerHero,
    totalFavoritos,
} from "./destacadas/predicates.ts";
export { LIMITE_DESTACADAS } from "./destacadas/types.ts";

export function seleccionarDestacadasConCategoria(
    peliculas: readonly Pelicula[],
    opciones: OpcionesSeleccionDestacadas = {},
): PeliculaDestacadaSeleccionada[] {
    const limite = opciones.limite ?? LIMITE_DESTACADAS;
    if (!Number.isSafeInteger(limite) || limite <= 0) return [];

    const hoy = opciones.hoy ?? fechaHoySantiago();
    const rng = opciones.rng ?? Math.random;
    const reglas = opciones.reglas ?? CONFIG_CUPOS_DESTACADAS;
    const mezclarOrden = opciones.mezclarOrden ?? true;

    const unicas = new Map(
        peliculas
            .filter(
                (pelicula) =>
                    pelicula.estadoEstreno !== ESTADO_PROXIMAMENTE &&
                    !esConcierto(pelicula),
            )
            .map((pelicula) => [pelicula.id, pelicula]),
    );
    const catalogo = [...unicas.values()];
    if (catalogo.length === 0) return [];

    const infoFavoritas = poolFavoritas(catalogo);
    const pools = new Map<CategoriaPoolId, Pelicula[]>(
        reglas.map((regla) => [
            regla.categoria,
            regla.categoria === "favoritas"
                ? infoFavoritas.candidatas
                : obtenerPoolCategoria(regla.categoria, catalogo, hoy),
        ]),
    );

    const usadas = new Set<string>();
    const conteos = new Map<CategoriaPoolId, number>(
        reglas.map((regla) => [regla.categoria, 0]),
    );
    const seleccionadas: PeliculaDestacadaSeleccionada[] = [];

    const agregarDeRegla = (regla: ReglaCupoCategoria): boolean => {
        const pool = pools.get(regla.categoria) ?? [];
        const disponibles = pool.filter((p) => !usadas.has(p.id));
        if (disponibles.length === 0) return false;

        const reglaEfectiva: ReglaCupoCategoria =
            regla.categoria === "favoritas" && infoFavoritas.empateEnTope
                ? {
                      ...regla,
                      estrategia: "aleatoria",
                      topAleatorio: pool.length,
                  }
                : regla;

        const elegida = elegirCandidata(disponibles, reglaEfectiva, rng);
        const rangoCategoria = pool.findIndex((p) => p.id === elegida.id) + 1;

        usadas.add(elegida.id);
        conteos.set(regla.categoria, (conteos.get(regla.categoria) ?? 0) + 1);
        seleccionadas.push({
            pelicula: elegida,
            categoria: regla.categoria,
            etiqueta: generarEtiqueta(
                regla.categoria,
                elegida,
                regla.categoria === "favoritas"
                    ? infoFavoritas.empateEnTope
                    : false,
            ),
            complemento: complementoPara(regla.categoria, elegida),
            rangoCategoria,
        });
        return true;
    };

    // Fase 1: Puestos fijos (en el orden definido para preservar prioridad de top)
    for (const regla of reglas) {
        while (
            seleccionadas.length < limite &&
            (conteos.get(regla.categoria) ?? 0) < Math.min(regla.min, regla.max)
        ) {
            if (!agregarDeRegla(regla)) break;
        }
    }

    // Fase 2: Puestos variables ponderados entre categorías elegibles con cupo libre
    while (seleccionadas.length < limite) {
        const elegibles = reglas.filter((regla) => {
            const asignados = conteos.get(regla.categoria) ?? 0;
            if (asignados >= regla.max) return false;
            const pool = pools.get(regla.categoria) ?? [];
            return pool.some((p) => !usadas.has(p.id));
        });

        if (elegibles.length === 0) break;

        const reglaElegida = elegirPonderada(elegibles, rng);
        agregarDeRegla(reglaElegida);
    }

    // Fase 3: Respaldo general para completar limite sin repetir
    if (seleccionadas.length < limite) {
        const respaldo = catalogo
            .filter((p) => !usadas.has(p.id))
            .sort(
                (a, b) =>
                    Number(a.estadoEstreno === ESTADO_PREVENTA) -
                        Number(b.estadoEstreno === ESTADO_PREVENTA) ||
                    Number(tieneBannerHero(b)) - Number(tieneBannerHero(a)) ||
                    compararPresencia(a, b) ||
                    compararBase(a, b),
            );

        for (const pelicula of respaldo) {
            if (seleccionadas.length >= limite) break;
            usadas.add(pelicula.id);
            seleccionadas.push({
                pelicula,
                categoria: "destacada",
                etiqueta: generarEtiqueta("destacada", pelicula),
                complemento: complementoPara("destacada", pelicula),
            });
        }
    }

    return mezclarOrden ? mezclarCarrusel(seleccionadas, rng) : seleccionadas;
}

export function seleccionarDestacadas(
    peliculas: readonly Pelicula[],
    limite = LIMITE_DESTACADAS,
): Pelicula[] {
    return seleccionarDestacadasConCategoria(peliculas, { limite }).map(
        (item) => item.pelicula,
    );
}
