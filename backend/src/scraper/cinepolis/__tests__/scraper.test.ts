import { describe, expect, it, vi } from "vitest";
import { startChromeSession } from "../browser.ts";
import { CINES_CINEPOLIS } from "../client.ts";
import { scrapeCinepolis } from "../scraper.ts";
import type { PageResult } from "../types.ts";

vi.mock("../browser.ts", () => ({ startChromeSession: vi.fn() }));

describe("scrapeCinepolis", () => {
    it("omite funciones secretas por título o por slug cuando falta la ficha", async () => {
        const cine = CINES_CINEPOLIS[0]!;
        const fecha = "2026-11-27";
        const ids = [
            "evento-25",
            "funcion-secreta-20",
            "evento-sin-numero",
            "cine-regular",
        ];
        const cartelera: PageResult = {
            movies: [
                { id: "evento-25", name: "FUNCION SECRETA 25" },
                { id: "evento-sin-numero", name: "  Función Secreta  " },
                { id: "cine-regular", name: "El secreto de sus ojos" },
            ],
            errores: [],
            billboards: {
                [cine.id]: {
                    estado: "ok",
                    idUsado: cine.id,
                    intentos: [],
                    schedules: ids.map((movieId) => ({
                        movieId,
                        dates: [
                            {
                                date: fecha,
                                languages: [
                                    {
                                        showtimes: [
                                            {
                                                sessionId: movieId,
                                                datetime: fecha + "T18:00:00-03:00",
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    })),
                },
            },
        };
        vi.mocked(startChromeSession).mockResolvedValue({
            evaluate: vi.fn().mockResolvedValue(cartelera),
            close: vi.fn().mockResolvedValue(undefined),
        });

        const resultado = await scrapeCinepolis({
            desde: fecha,
            dias: 1,
            cines: [cine.id],
            limitePorCine: null,
        });

        expect(resultado.peliculas.map(({ titulo }) => titulo)).toEqual([
            "El secreto de sus ojos",
        ]);
        expect(resultado.horarios.map(({ peliculaId }) => peliculaId)).toEqual([
            "cinepolis:cine-regular",
        ]);
        expect(resultado.incidencias).toEqual([]);
        expect(resultado.meta.completo).toBe(true);
    });
});
