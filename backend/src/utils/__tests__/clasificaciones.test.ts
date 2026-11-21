import { describe, expect, it } from "vitest";
import { normalizarClasificacion } from "../clasificaciones.ts";

describe("normalizarClasificacion", () => {
    it("retorna TE para entrada TE", () => {
        expect(normalizarClasificacion("TE")).toBe("TE");
    });

    it("normaliza alias de MA14", () => {
        expect(normalizarClasificacion("14")).toBe("MA14");
        expect(normalizarClasificacion("+14")).toBe("MA14");
        expect(normalizarClasificacion("14+")).toBe("MA14");
    });

    it("normaliza alias de MA18", () => {
        expect(normalizarClasificacion("18")).toBe("MA18");
        expect(normalizarClasificacion("+18")).toBe("MA18");
        expect(normalizarClasificacion("18+")).toBe("MA18");
    });

    it("retorna la cadena original si no es un alias conocido", () => {
        expect(normalizarClasificacion("NOSE")).toBe("NOSE");
    });

    it("retorna string vacio para null", () => {
        expect(normalizarClasificacion(null)).toBe("");
    });
});
