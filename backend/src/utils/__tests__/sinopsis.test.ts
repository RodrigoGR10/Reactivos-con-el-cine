import { describe, expect, it } from "vitest";
import { normalizarSinopsis } from "../sinopsis.ts";

describe("normalizarSinopsis", () => {
    it("retorna 'No hay sinopsis disponible.' para valores nulos, undefined o vacíos", () => {
        expect(normalizarSinopsis(null)).toBe("No hay sinopsis disponible.");
        expect(normalizarSinopsis(undefined)).toBe(
            "No hay sinopsis disponible.",
        );
        expect(normalizarSinopsis("")).toBe("No hay sinopsis disponible.");
        expect(normalizarSinopsis("   ")).toBe("No hay sinopsis disponible.");
    });

    it("detecta placeholders típicos de cadenas de cine y los reemplaza", () => {
        expect(normalizarSinopsis("Sinopsis no publicada")).toBe(
            "No hay sinopsis disponible.",
        );
        expect(normalizarSinopsis("sinopsis no publicada.")).toBe(
            "No hay sinopsis disponible.",
        );
        expect(normalizarSinopsis("No hay sinopsis disponible")).toBe(
            "No hay sinopsis disponible.",
        );
        expect(
            normalizarSinopsis("No hay sinopsis disponible por Cinemark."),
        ).toBe("No hay sinopsis disponible.");
        expect(
            normalizarSinopsis("Sinopsis no publicada por Cineplanet!"),
        ).toBe("No hay sinopsis disponible.");
    });

    it("preserva sinopsis válidas recortando espacios en los extremos", () => {
        const texto =
            "  Un grupo de héroes viaja por el espacio para salvar la galaxia.  ";
        expect(normalizarSinopsis(texto)).toBe(
            "Un grupo de héroes viaja por el espacio para salvar la galaxia.",
        );
    });
});
