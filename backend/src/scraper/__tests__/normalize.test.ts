import { describe, expect, it } from "vitest";
import { fechaDeEstreno, isDate, scheduleRevision } from "../normalize.ts";

describe("scraper/normalize", () => {
    describe("isDate", () => {
        it("valida fechas válidas en formato YYYY-MM-DD", () => {
            expect(isDate("2026-11-21")).toBe(true);
            expect(isDate("2024-02-29")).toBe(true); // bisiesto
        });

        it("rechaza fechas con formato o valores inválidos", () => {
            expect(isDate("2023-02-29")).toBe(false); // 2023 no fue bisiesto
            expect(isDate("0000-01-01")).toBe(false);
            expect(isDate("21-11-2026")).toBe(false);
            expect(isDate("2026/11/21")).toBe(false);
            expect(isDate("2026-13-01")).toBe(false);
            expect(isDate("")).toBe(false);
            expect(isDate("random string")).toBe(false);
        });
    });

    describe("fechaDeEstreno", () => {
        it("extrae la fecha si los primeros 10 caracteres corresponden a una fecha válida", () => {
            expect(fechaDeEstreno("2026-12-25T14:00:00Z")).toBe("2026-12-25");
            expect(fechaDeEstreno("2026-05-10")).toBe("2026-05-10");
        });

        it("retorna undefined para valores inválidos o indefinidos", () => {
            expect(fechaDeEstreno(undefined)).toBeUndefined();
            expect(fechaDeEstreno("invalido")).toBeUndefined();
            expect(fechaDeEstreno("")).toBeUndefined();
        });
    });

    describe("scheduleRevision", () => {
        it("produce un JSON serializado determinista basado en los atributos del horario", () => {
            const schedule = {
                peliculaId: "pelicula-1",
                cineId: "cinemark:100",
                sesionId: "sesion-99",
                fecha: "2026-11-25",
                fechaCartelera: "2026-11-25",
                horario: "19:30:00",
                formatoResumen: "2D Doblada",
                idioma: "Español",
                sala: "Sala 4",
                urlCompra: "https://ejemplo.com/ticket",
            };

            const rev1 = scheduleRevision(schedule);
            const rev2 = scheduleRevision({ ...schedule });

            expect(rev1).toBe(rev2);
            expect(rev1).toContain("sesion-99");
            expect(rev1).toContain("https://ejemplo.com/ticket");
        });

        it("omite urlCompra si no viene definida", () => {
            const schedule = {
                peliculaId: "p1",
                cineId: "c1",
                sesionId: "s1",
                fecha: "2026-11-25",
                fechaCartelera: "2026-11-25",
                horario: "20:00:00",
                formatoResumen: "3D",
                idioma: "Subtitulada",
                sala: "Sala 1",
            };

            const revision = scheduleRevision(schedule);
            const parsed = JSON.parse(revision);
            expect(parsed).toHaveLength(9);
        });
    });
});
