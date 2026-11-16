import { claveParaDuplicados } from "../../utils/titulos.ts";
import type { GrupoDuplicado, PeliculaRow } from "./types.ts";

function obtenerTipoEdicion(titulo: string): "original" | "aniversario" {
    return /\b\d+\s*(?:°|º)?\s*ANIVERSARIO\b/i.test(titulo)
        ? "aniversario"
        : "original";
}

function sonDuplicadas(a: PeliculaRow, b: PeliculaRow): boolean {
    // Nunca mezclar ediciones diferentes.
    if (obtenerTipoEdicion(a.titulo) !== obtenerTipoEdicion(b.titulo)) {
        return false;
    }

    // Si ambos tienen TMDB, debe coincidir.
    if (a.tmdb_id !== null && b.tmdb_id !== null) {
        return a.tmdb_id === b.tmdb_id;
    }

    // Si solo uno tiene TMDB, no hay evidencia suficiente.
    if (a.tmdb_id !== null || b.tmdb_id !== null) {
        return false;
    }

    // Sin TMDB: comparar duración y título.
    if (
        a.duracion !== null &&
        b.duracion !== null &&
        Math.abs(a.duracion - b.duracion) > 10
    ) {
        return false;
    }

    const tituloA = claveParaDuplicados(a.titulo);
    const tituloB = claveParaDuplicados(b.titulo);

    return tituloA.length > 0 && tituloA === tituloB;
}

function elegirCanonica(grupo: PeliculaRow[]): PeliculaRow {
    return (
        grupo.find((pelicula) => pelicula.tiene_cinemark) ??
        [...grupo].sort((a, b) => a.id - b.id)[0]
    );
}

export function detectarGrupos(peliculas: PeliculaRow[]): GrupoDuplicado[] {
    const visitadas = new Set<number>();
    const grupos: GrupoDuplicado[] = [];

    for (const pelicula of peliculas) {
        if (visitadas.has(pelicula.id)) continue;

        const grupo: PeliculaRow[] = [pelicula];
        visitadas.add(pelicula.id);

        // Agrupación transitiva.
        let huboCambios = true;

        while (huboCambios) {
            huboCambios = false;

            for (const candidata of peliculas) {
                if (visitadas.has(candidata.id)) continue;

                if (
                    grupo.some((miembro) => sonDuplicadas(miembro, candidata))
                ) {
                    grupo.push(candidata);
                    visitadas.add(candidata.id);
                    huboCambios = true;
                }
            }
        }

        if (grupo.length <= 1) continue;

        const canonica = elegirCanonica(grupo);

        grupos.push({
            canonica,
            duplicadas: grupo.filter((miembro) => miembro.id !== canonica.id),
        });
    }

    return grupos;
}
