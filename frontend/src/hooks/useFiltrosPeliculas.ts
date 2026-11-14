import { useState } from "react";
import type { Pelicula } from "../types/types";
import type { OpcionFiltro } from "../components/common/SelectorMultiple";
import { normalizarTexto } from "../utils/normalizarTexto";
import { cumpleFiltroDuracion } from "../utils/cumpleFiltroDuracion";

const RANGOS_DURACION = [
    { valor: "corta", nombre: "Hasta 100 min" },
    { valor: "media", nombre: "101 a 130 min" },
    { valor: "larga", nombre: "Más de 130 min" },
] as const;

const ORDEN_CLASIFICACION: Record<string, number> = {
    TE: 0,
    "TE+7": 1,
    MA14: 2,
    MA18: 3,
    TBC: 4,
};

const separarGeneros = (genero: string) =>
    genero
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

const contarOpciones = (
    peliculas: Pelicula[],
    extraerValores: (pelicula: Pelicula) => string[],
    comparar: (a: OpcionFiltro, b: OpcionFiltro) => number,
): OpcionFiltro[] => {
    const conteo = new Map<string, number>();
    for (const pelicula of peliculas) {
        for (const valor of new Set(extraerValores(pelicula))) {
            if (!valor) continue;
            conteo.set(valor, (conteo.get(valor) ?? 0) + 1);
        }
    }
    return [...conteo.entries()]
        .map(([valor, cantidad]) => ({ valor, nombre: valor, cantidad }))
        .sort(comparar);
};

export interface Filtros {
    busqueda: string;
    generos: string[];
    clasificaciones: string[];
    duracion: string;
}

const FILTROS_INICIALES: Filtros = {
    busqueda: "",
    generos: [],
    clasificaciones: [],
    duracion: "",
};

/**
 * Administra búsqueda textual y filtros activos de cartelera y preventas.
 */
export function useFiltrosPeliculas(peliculas: Pelicula[]) {
    const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIALES);

    const cambiarFiltro = <K extends keyof Filtros>(campo: K, valor: Filtros[K]) =>
        setFiltros((anterior) => ({ ...anterior, [campo]: valor }));

    const limpiarFiltros = () => setFiltros(FILTROS_INICIALES);

    const terminoBusqueda = normalizarTexto(filtros.busqueda.trim());

    const peliculasFiltradas = peliculas.filter(
        (pelicula) =>
            normalizarTexto(pelicula.titulo).includes(terminoBusqueda) &&
            (filtros.generos.length === 0 ||
                separarGeneros(pelicula.genero).some((genero) =>
                    filtros.generos.includes(genero),
                )) &&
            (filtros.clasificaciones.length === 0 ||
                filtros.clasificaciones.includes(pelicula.clasificacion)) &&
            cumpleFiltroDuracion(pelicula.duracion, filtros.duracion),
    );

    const hayFiltrosActivos =
        terminoBusqueda !== "" ||
        filtros.generos.length > 0 ||
        filtros.clasificaciones.length > 0 ||
        filtros.duracion !== "";

    const generosDisponibles = contarOpciones(
        peliculas,
        (pelicula) => separarGeneros(pelicula.genero),
        (a, b) => a.nombre.localeCompare(b.nombre, "es"),
    );

    const clasificacionesDisponibles = contarOpciones(
        peliculas,
        (pelicula) => (pelicula.clasificacion ? [pelicula.clasificacion] : []),
        (a, b) =>
            (ORDEN_CLASIFICACION[a.valor] ?? 99) - (ORDEN_CLASIFICACION[b.valor] ?? 99)
            || a.nombre.localeCompare(b.nombre, "es"),
    );

    const duracionesDisponibles: OpcionFiltro[] = RANGOS_DURACION.map(
        ({ valor, nombre }) => ({
            valor,
            nombre,
            cantidad: peliculas.filter((pelicula) =>
                cumpleFiltroDuracion(pelicula.duracion, valor),
            ).length,
        }),
    );

    return {
        filtros,
        cambiarFiltro,
        limpiarFiltros,
        hayFiltrosActivos,
        peliculasFiltradas,
        generosDisponibles,
        clasificacionesDisponibles,
        duracionesDisponibles,
    };
}
