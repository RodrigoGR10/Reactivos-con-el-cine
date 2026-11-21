import { describe, expect, it } from "vitest";
import { localNow } from "../localNow.ts";

describe("localNow", () => {
    it("convierte una fecha UTC a formato ISO local en America/Santiago", () => {
        // En junio (horario de invierno de Chile, UTC-4):
        // 2026-06-15 16:30:00 UTC -> 2026-06-15 12:30:00 en Santiago
        const fechaInvierno = new Date("2026-06-15T16:30:00Z");
        expect(localNow(fechaInvierno)).toBe("2026-06-15T12:30:00");
    });

    it("genera formato YYYY-MM-DDTHH:mm:ss al invocarse sin argumentos", () => {
        const resultado = localNow();
        expect(resultado).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
    });
});
