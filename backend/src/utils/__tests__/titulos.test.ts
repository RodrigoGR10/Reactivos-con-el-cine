import { describe, expect, it } from "vitest";
import {
    claveBasica,
    claveParaConflictos,
    claveParaDuplicados,
    sinAcentosEnMayusculas,
} from "../titulos.ts";

describe("sinAcentoEnMayusculas", () => {
    it("convierte mayusculas y elimina tildes", () => {
        expect(sinAcentosEnMayusculas("Avión")).toBe("AVION");
        expect(sinAcentosEnMayusculas("avion")).toBe("AVION");
    });
});

describe("clavebasica", () => {
    it("elimina todo lo que no sea alfanumerico", () => {
        expect(claveBasica("Avengers: Endgame")).toBe("AVENGERSENDGAME");
    });

    it("no discrimina cuando el titulo lleva tilde", () => {
        expect(claveBasica("Avión")).toBe(claveBasica("avion"));
    });
});

describe("claveParaConflictos", () => {
    it("elimina todo rastro de parentesis o corchetes", () => {
        expect(claveParaConflictos("Shrek [2001]")).toBe("SHREK");
        expect(claveParaConflictos("Shrek (2001)")).toBe("SHREK");
    });
    it("efectivamente sirve para resolver conflictos", () => {
        expect(claveParaConflictos("Dune [2021]")).toBe(
            claveParaConflictos("Dune"),
        );
    });

    it("elimina etiquetas de funciones", () => {
        expect(claveParaConflictos("Shrek 4K")).toBe(
            claveParaConflictos("Shrek"),
        );
        expect(claveParaConflictos("Shrek 3D")).toBe(
            claveParaConflictos("Shrek"),
        );
        expect(claveParaConflictos("Shrek 2D")).toBe(
            claveParaConflictos("Shrek"),
        );
        expect(claveParaConflictos("Shrek IMAX")).toBe(
            claveParaConflictos("Shrek"),
        );
        expect(claveParaConflictos("Shrek XD")).toBe(
            claveParaConflictos("Shrek"),
        );
    });
});

describe("claveParaConflictos", () => {
    it("elimina el año entre corchetes o paréntesis", () => {
        expect(claveParaConflictos("Dune [2021]")).toBe(
            claveParaConflictos("Dune"),
        );
        expect(claveParaConflictos("Dune (2021)")).toBe(
            claveParaConflictos("Dune"),
        );
    });

    it("elimina etiquetas de formato", () => {
        expect(claveParaConflictos("Top Gun 4K")).toBe(
            claveParaConflictos("Top Gun"),
        );
        expect(claveParaConflictos("Top Gun IMAX")).toBe(
            claveParaConflictos("Top Gun"),
        );
    });
});

describe("claveParaDuplicados", () => {
    it("equipara películas con y sin sufijo LIVE VIEWING", () => {
        expect(claveParaDuplicados("Dragon Ball LIVE VIEWING")).toBe(
            claveParaDuplicados("Dragon Ball"),
        );
    });

    it("equipara película normal con su versión 3D", () => {
        expect(claveParaDuplicados("El Rey León 3D")).toBe(
            claveParaDuplicados("El Rey León"),
        );
    });

    it("equipara películas con y sin año", () => {
        expect(claveParaDuplicados("Fantasmas 2024")).toBe(
            claveParaDuplicados("Fantasmas"),
        );
    });
});
