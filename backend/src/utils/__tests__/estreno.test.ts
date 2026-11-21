import { describe, expect, it } from "vitest";
import { clasificarEstreno } from "../estreno.ts";

describe("clasificarEstreno", () => {
    const HOY = "2026-11-21";

    describe("peliculas con etiqueta 'proximamente'", () => {
        it("clasifica con 'proximamente' cuando estadoEstreno viene explicito", () => {
            const fuentes = [
                {
                    estadoEstreno: "proximamente" as const,
                    fechaEstreno: "2026-12-25",
                },
            ];

            const resultado = clasificarEstreno(fuentes, HOY);

            expect(resultado).toEqual({
                estadoEstreno: "proximamente",
                fechaEstreno: "2026-12-25",
            });
        });

        it("clasifica con 'proximamente' sin que fechaEstreno venga definida", () => {
            const fuentes = [
                {
                    estadoEstreno: "proximamente" as const,
                },
            ];

            const resultado = clasificarEstreno(fuentes, HOY);

            expect(resultado).toEqual({
                estadoEstreno: "proximamente",
            });
        });
    });

    describe("peliculas sin etiqueta de estadoEstreno explicita", () => {
        it("Si fechaEstreno > fecha de hoy, estadoEstreno debe ser 'preventa'", () => {
            const fuentes = [
                {
                    fechaEstreno: "2026-12-25",
                },
            ];

            const resultado = clasificarEstreno(fuentes, HOY);

            expect(resultado).toEqual({
                estadoEstreno: "preventa",
                fechaEstreno: "2026-12-25",
            });
        });

        it("Si fechaEstreno < fecha de hoy, se clasifica como en 'cartelera'", () => {
            const funciones = [
                {
                    fechaEstreno: "2026-11-18",
                },
            ];

            const resultado = clasificarEstreno(funciones, HOY);

            expect(resultado).toEqual({
                estadoEstreno: "cartelera",
                fechaEstreno: "2026-11-18",
            });
        });

        it("Tambien se considera en 'cartelera' cuando fechaEstreno == fecha de hoy", () => {
            const funciones = [
                {
                    fechaEstreno: HOY,
                },
            ];

            const resultado = clasificarEstreno(funciones, HOY);

            expect(resultado).toEqual({
                estadoEstreno: "cartelera",
                fechaEstreno: HOY,
            });
        });
    });

    describe("resolucion de conflictos entre multiples cadenas/fuentes", () => {
        it("prioriza 'cartelera' sobre 'preventa' o 'proximamente'", () => {
            const fuentes = [
                {
                    estadoEstreno: "proximamente" as const,
                    fechaEstreno: "2026-11-01",
                },
                {
                    estadoEstreno: "preventa" as const,
                    fechaEstreno: "2026-11-01",
                },
                {
                    fechaEstreno: "2026-11-01", // ya estrenada
                },
            ];

            const resultado = clasificarEstreno(fuentes, HOY);

            expect(resultado).toEqual({
                estadoEstreno: "cartelera",
                fechaEstreno: "2026-11-01",
            });
        });

        it("selecciona la fecha de estreno mas temprana (estrenos duplicados)", () => {
            const fuentes = [
                {
                    fechaEstreno: "2026-12-15",
                },
                {
                    fechaEstreno: "2026-12-05",
                },
            ];

            const resultado = clasificarEstreno(fuentes, HOY);

            expect(resultado).toEqual({
                estadoEstreno: "preventa",
                fechaEstreno: "2026-12-05",
            });
        });
    });

    describe("objetos con método .toObject() y casos vacíos", () => {
        it("soporta modelos que implementan .toObject()", () => {
            const fuenteConMetodo = {
                toObject: () => ({
                    estadoEstreno: "proximamente" as const,
                    fechaEstreno: "2026-12-31",
                }),
            };

            const resultado = clasificarEstreno([fuenteConMetodo], HOY);

            expect(resultado).toEqual({
                estadoEstreno: "proximamente",
                fechaEstreno: "2026-12-31",
            });
        });

        it("retorna 'cartelera' por defecto si la lista de fuentes está vacía", () => {
            const resultado = clasificarEstreno([], HOY);

            expect(resultado).toEqual({
                estadoEstreno: "cartelera",
            });
        });
    });
});
