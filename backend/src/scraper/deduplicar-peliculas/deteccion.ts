import { areSameCatalogMovie } from "../tmdb/catalogo.ts";
import type { GrupoDuplicado, PeliculaRow } from "./types.ts";

function obtenerTipoEdicion(titulo: string): "original" | "aniversario" {
    return /\b\d+\s*(?:°|º)?\s*ANIVERSARIO\b/i.test(titulo)
        ? "aniversario"
        : "original";
}

function sonDuplicadas(a: PeliculaRow, b: PeliculaRow): boolean {
    if (obtenerTipoEdicion(a.titulo) !== obtenerTipoEdicion(b.titulo)) {
        return false;
    }

    if (a.tmdb_id !== null && b.tmdb_id !== null) {
        return a.tmdb_id === b.tmdb_id;
    }

    return areSameCatalogMovie(
        {
            titulo: a.titulo,
            tituloOriginal: a.titulo_original ?? undefined,
            duracion: a.duracion ?? 0,
            tmdbId: a.tmdb_id ?? undefined,
        },
        {
            titulo: b.titulo,
            tituloOriginal: b.titulo_original ?? undefined,
            duracion: b.duracion ?? 0,
            tmdbId: b.tmdb_id ?? undefined,
        },
    );
}

function elegirCanonica(grupo: [PeliculaRow, ...PeliculaRow[]]): PeliculaRow {
    return (
        grupo.find((pelicula) => pelicula.tiene_cinemark) ??
        grupo.reduce(
            (menor, actual) => (actual.id < menor.id ? actual : menor),
            grupo[0],
        )
    );
}

/**
 * Agrupa películas que probablemente representan el mismo título.
 * @param peliculas Películas que se comparan, agrupan o actualizan.
 */
export function detectarGrupos(peliculas: PeliculaRow[]): GrupoDuplicado[] {
    const visitadas = new Set<number>();
    const grupos: GrupoDuplicado[] = [];

    for (const pelicula of peliculas) {
        if (visitadas.has(pelicula.id)) continue;

        const grupo: [PeliculaRow, ...PeliculaRow[]] = [pelicula];
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
