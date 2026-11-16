import { claveBasica } from "../../utils/titulos.ts";
import { parseMovieTitleForSearch } from "./consulta.ts";
import { detectarTipoContenido } from "./tipo-contenido.ts";

interface PeliculaCatalogo {
    titulo: string;
    duracion: number;
    tmdbId?: number;
}

export function areSameCatalogMovie(
    a: PeliculaCatalogo,
    b: PeliculaCatalogo,
): boolean {
    // Un mismo ID externo no basta para fusionar:
    // primero comprobamos el título y la duración.
    if (a.tmdbId && b.tmdbId && a.tmdbId !== b.tmdbId) {
        return false;
    }

    if (Math.abs(a.duracion - b.duracion) > 10) {
        return false;
    }

    const tipoA = detectarTipoContenido(a.titulo);
    const tipoB = detectarTipoContenido(b.titulo);

    // No fusionar eventos o aniversarios con películas normales.
    if (tipoA !== "DESCONOCIDO" || tipoB !== "DESCONOCIDO") {
        return false;
    }

    const parsedA = parseMovieTitleForSearch(a.titulo);
    const parsedB = parseMovieTitleForSearch(b.titulo);

    const keyA = claveBasica(parsedA.queries[0] ?? a.titulo);
    const keyB = claveBasica(parsedB.queries[0] ?? b.titulo);

    return keyA.length > 0 && keyA === keyB;
}
