import { describe, it, expect } from "vitest";
import { claveComuna, esComunaOficial, normalizarComuna } from "../comunas.ts";

describe("claveComuna", () => {
    it("convierte a minúsculas sin tildes", () => {
        expect(claveComuna("ÑUÑOA")).toBe("nunoa");
        expect(claveComuna("Viña del Mar")).toBe("vina del mar");
    });

    it("colapsa espacios múltiples", () => {
        expect(claveComuna("  Las  Condes  ")).toBe("las condes");
    });
});

describe("esComunaOficial", () => {
    it("reconoce comunas oficiales de Chile", () => {
        expect(esComunaOficial("Santiago")).toBe(true);
        expect(esComunaOficial("Las Condes")).toBe(true);
    });

    it("retorna false para valores que no son comunas", () => {
        expect(esComunaOficial("Ciudad de México")).toBe(false);
        expect(esComunaOficial("")).toBe(false);
    });

    it("es case-insensitive", () => {
        expect(esComunaOficial("SANTIAGO")).toBe(true);
        expect(esComunaOficial("las condes")).toBe(true);
    });
});

describe("normalizarComuna", () => {
    it("normaliza VIÑA DEL MAR → Viña del Mar", () => {
        expect(normalizarComuna("VIÑA DEL MAR")).toBe("Viña del Mar");
    });

    it("normaliza LOS ANDES → Los Andes", () => {
        expect(normalizarComuna("LOS ANDES")).toBe("Los Andes");
    });

    it("retorna valor capitalizado si no es comuna conocida", () => {
        // No es una comuna de Chile, pero no explota — capitaliza respetando conectores
        const resultado = normalizarComuna("CIUDAD DE PRUEBA");
        expect(resultado).toBe("Ciudad de Prueba");
    });

    it("retorna string vacío si entra string vacío", () => {
        expect(normalizarComuna("")).toBe("");
    });
});
