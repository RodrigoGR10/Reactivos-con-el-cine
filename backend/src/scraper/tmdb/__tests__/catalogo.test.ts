import { describe, expect, it } from "vitest";
import { areSameCatalogMovie } from "../catalogo.ts";

describe("areSameCatalogMovie", () => {
    it("retorna true inmediatamente si ambos tienen el mismo tmdbId", () => {
        const a = { titulo: "Dune", duracion: 155, tmdbId: 438631 };
        const b = { titulo: "Duna (2021)", duracion: 155, tmdbId: 438631 };

        expect(areSameCatalogMovie(a, b)).toBe(true);
    });

    it("retorna false si los años explícitos en el título difieren", () => {
        const a = { titulo: "Dune (1984)", duracion: 137 };
        const b = { titulo: "Dune (2021)", duracion: 155 };

        expect(areSameCatalogMovie(a, b)).toBe(false);
    });

    it("detecta coincidencia por título canónico normalizado", () => {
        const a = { titulo: "Avengers: Endgame 3D", duracion: 181 };
        const b = { titulo: "AVENGERS ENDGAME", duracion: 181 };

        expect(areSameCatalogMovie(a, b)).toBe(true);
    });

    it("detecta coincidencia cruzada entre título y tituloOriginal", () => {
        const a = {
            titulo: "Intensamente 2",
            tituloOriginal: "Inside Out 2",
            duracion: 96,
        };
        const b = {
            titulo: "Inside Out 2",
            duracion: 96,
        };

        expect(areSameCatalogMovie(a, b)).toBe(true);
    });

    it("retorna false para películas con títulos completamente distintos", () => {
        const a = { titulo: "Batman", duracion: 175 };
        const b = { titulo: "Superman", duracion: 143 };

        expect(areSameCatalogMovie(a, b)).toBe(false);
    });
});
