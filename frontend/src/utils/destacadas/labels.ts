import type { Pelicula } from "../../types/types.ts";
import { parsearFechaUtcMs } from "./dates.ts";
import { totalFavoritos } from "./predicates.ts";
import {
    ESTADO_PREVENTA,
    type CategoriaDestacada,
    type ComplementoEtiquetaDestacada,
} from "./types.ts";

/**
 * Produce el dato secundario que acompaña a la etiqueta de una destacada.
 * @param categoria Categoría por la que se eligió la película.
 * @param pelicula Película que se presenta.
 * @returns Fecha, nota o conteo de favoritos cuando aplica.
 */
export function complementoPara(
    categoria: CategoriaDestacada,
    pelicula: Pelicula,
): ComplementoEtiquetaDestacada | undefined {
    if (
        categoria === "preventas_esperadas" ||
        (categoria === "destacada" &&
            pelicula.estadoEstreno === ESTADO_PREVENTA)
    ) {
        const fecha = pelicula.fechaEstreno;
        return fecha && parsearFechaUtcMs(fecha) !== null
            ? { tipo: "fecha", valor: fecha }
            : undefined;
    }
    if (
        categoria === "mejor_valoradas" &&
        typeof pelicula.calificacionTmdb === "number"
    ) {
        return {
            tipo: "calificacion",
            valor: pelicula.calificacionTmdb.toFixed(1),
        };
    }
    if (categoria === "favoritas") {
        const favs = totalFavoritos(pelicula);
        return favs !== undefined && favs > 0
            ? { tipo: "favoritos", valor: favs }
            : undefined;
    }
    return undefined;
}

/**
 * Genera la etiqueta visible que explica por qué se destaca una película.
 * @param categoria Categoría asignada durante la selección.
 * @param pelicula Película seleccionada.
 * @param empateFavoritas Indica si comparte el máximo de favoritos.
 * @returns Texto localizado para el carrusel.
 */
export function generarEtiqueta(
    categoria: CategoriaDestacada,
    pelicula: Pelicula,
    empateFavoritas = false,
): string {
    switch (categoria) {
        case "favoritas":
            return empateFavoritas
                ? "Destacada por los usuarios"
                : "N° 1 en favoritos";
        case "estrenos_recientes":
            return "Recién estrenada";
        case "mejor_valoradas":
            return "Mejor valorada";
        case "en_mas_salas":
            return "Tendencia en cines";
        case "preventas_esperadas":
            return "Estreno esperado";
        case "reestrenos":
            return pelicula.fechaEstrenoTmdb
                ? `Regresa a cines · ${pelicula.fechaEstrenoTmdb.slice(0, 4)}`
                : "Regresa a cines";
        case "destacada":
            return pelicula.estadoEstreno === ESTADO_PREVENTA
                ? "Estreno esperado"
                : "Destacada de la semana";
    }
}
