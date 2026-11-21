import { describe, expect, it } from "vitest";
import { normalizarGeneros } from "../generos.ts";

describe("normalizarGeneros", () => {
    it("convierte sinónimos comunes a nombres canónicos", () => {
        expect(normalizarGeneros("animada")).toBe("Animación");
        expect(normalizarGeneros("animacion")).toBe("Animación");
        expect(normalizarGeneros("horror")).toBe("Terror");
        expect(normalizarGeneros("terror")).toBe("Terror");
        expect(normalizarGeneros("ciencia ficcion")).toBe("Ciencia ficción");
        expect(normalizarGeneros("aventuras")).toBe("Aventura");
        expect(normalizarGeneros("suspenso")).toBe("Suspenso");
        expect(normalizarGeneros("suspense")).toBe("Suspenso");
        expect(normalizarGeneros("thriler")).toBe("Thriller");
    });

    it("soporta múltiples delimitadores (comas, barras, punto y coma, pipes)", () => {
        expect(normalizarGeneros("Acción, Aventura/Comedia|Drama;Terror")).toBe(
            "Acción, Aventura, Comedia, Drama, Terror",
        );
    });

    it("elimina duplicados tras la normalización", () => {
        expect(normalizarGeneros("ACCION, acción, Animada, animación")).toBe(
            "Acción, Animación",
        );
    });

    it("capitaliza adecuadamente géneros que no están en la lista de alias", () => {
        expect(normalizarGeneros("documental")).toBe("Documental");
        expect(normalizarGeneros("biográfico")).toBe("Biográfico");
    });

    it("maneja espacios irregulares y cadenas vacías", () => {
        expect(normalizarGeneros("   Acción   ,   Drama   ")).toBe(
            "Acción, Drama",
        );
        expect(normalizarGeneros("")).toBe("");
        expect(normalizarGeneros("   ")).toBe("");
    });

    it("devuelve el valor tal cual si no es string", () => {
        expect(normalizarGeneros(null)).toBe(null);
        expect(normalizarGeneros(undefined)).toBe(undefined);
    });
});
