import { describe, expect, it } from "vitest";
import { normalizeCinema, normalizeMovie } from "../normalize.ts";
import type { Cinema, Movie } from "../types.ts";

describe("scraper/cineplanet/normalize", () => {
    const EXTRACTED_AT = "2026-11-21T12:00:00.000Z";

    describe("normalizeCinema", () => {
        it("normaliza un cine de Cineplanet y aplica coordenadas de respaldo si es Independencia", () => {
            const raw: Cinema = {
                ID: "0000000012",
                name: "CP Mall Barrio Independencia",
                formattedCinemaName: "cp-independencia",
                address: "Av. Independencia 565",
                city: "Santiago",
                latitude: "0",
                longitude: "0",
            };

            const normalizado = normalizeCinema(raw, EXTRACTED_AT);

            expect(normalizado.id).toBe("cineplanet:0000000012");
            expect(normalizado.nombre).toBe(
                "Cineplanet Mall Barrio Independencia",
            );
            expect(normalizado.comuna).toBe("Santiago");
            expect(normalizado.latitud).toBe(-33.424655);
            expect(normalizado.longitud).toBe(-70.654405);
        });

        it("lanza error si falta ID o nombre", () => {
            const raw = { ID: "", name: "" } as unknown as Cinema;
            expect(() => normalizeCinema(raw, EXTRACTED_AT)).toThrow(
                "Falta id de cine en Cineplanet.",
            );
        });
    });

    describe("normalizeMovie", () => {
        it("normaliza película con género, sinopsis y clasificación", () => {
            const raw: Movie = {
                id: "HO00001",
                title: "Moana 2",
                runTime: 100,
                genre: "Animación",
                ratingDescription: "TE",
                synopsis: "Moana emprende un viaje inesperado.",
                posterUrl: "https://cineplanet.cl/posters/moana.jpg",
                trailer: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                OpeningDate: "2026-11-28",
                isPreSale: true,
                movieDetailsUrl: "https://cineplanet.cl/peliculas/moana-2",
                cinemas: [],
            };

            const normalizada = normalizeMovie(raw, EXTRACTED_AT);

            expect(normalizada.id).toBe("cineplanet:HO00001");
            expect(normalizada.titulo).toBe("Moana 2");
            expect(normalizada.duracion).toBe(100);
            expect(normalizada.clasificacion).toBe("TE");
            expect(normalizada.estadoEstreno).toBe("preventa");
            expect(normalizada.fechaEstreno).toBe("2026-11-28");
        });
    });
});
