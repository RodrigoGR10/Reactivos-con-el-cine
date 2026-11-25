import { describe, expect, it } from "vitest";
import { detectarGrupos } from "../deteccion.ts";
import type { PeliculaRow } from "../types.ts";

describe("detectarGrupos (deduplicación)", () => {
    const buildPelicula = (
        overrides: Partial<PeliculaRow> = {},
    ): PeliculaRow => ({
        id: 1,
        titulo: "Película Genérica",
        titulo_original: null,
        duracion: 120,
        tmdb_id: null,
        tiene_cinemark: false,
        ...overrides,
    });

    it("agrupa películas con el mismo tmdb_id", () => {
        const peliculas: PeliculaRow[] = [
            buildPelicula({ id: 1, titulo: "Dune", tmdb_id: 1234 }),
            buildPelicula({ id: 2, titulo: "Duna", tmdb_id: 1234 }),
            buildPelicula({ id: 3, titulo: "Gladiador II", tmdb_id: 9999 }),
        ];

        const grupos = detectarGrupos(peliculas);

        expect(grupos).toHaveLength(1);
        expect(grupos[0]?.canonica.id).toBe(1);
        expect(grupos[0]?.duplicadas).toHaveLength(1);
        expect(grupos[0]?.duplicadas[0]?.id).toBe(2);
    });

    it("prioriza la película de Cinemark como canónica", () => {
        const peliculas: PeliculaRow[] = [
            buildPelicula({
                id: 10,
                titulo: "Avatar",
                tmdb_id: 500,
                tiene_cinemark: false,
            }),
            buildPelicula({
                id: 25,
                titulo: "Avatar 2D",
                tmdb_id: 500,
                tiene_cinemark: true,
            }),
        ];

        const grupos = detectarGrupos(peliculas);

        expect(grupos).toHaveLength(1);
        expect(grupos[0]?.canonica.id).toBe(25);
        expect(grupos[0]?.duplicadas[0]?.id).toBe(10);
    });

    it("no agrupa una edición de aniversario con una versión original", () => {
        const peliculas: PeliculaRow[] = [
            buildPelicula({ id: 1, titulo: "Coraline" }),
            buildPelicula({ id: 2, titulo: "Coraline 15° Aniversario" }),
        ];

        const grupos = detectarGrupos(peliculas);

        expect(grupos).toHaveLength(0);
    });

    it("agrupa transitivamente (si A es duplicada de B y B de C)", () => {
        const peliculas: PeliculaRow[] = [
            buildPelicula({ id: 1, titulo: "Moana 2", tmdb_id: 888 }),
            buildPelicula({ id: 2, titulo: "Vaiana 2", tmdb_id: 888 }),
            buildPelicula({ id: 3, titulo: "Moana 2 (Doblada)", tmdb_id: 888 }),
        ];

        const grupos = detectarGrupos(peliculas);

        expect(grupos).toHaveLength(1);
        expect(grupos[0]?.duplicadas).toHaveLength(2);
    });
});
