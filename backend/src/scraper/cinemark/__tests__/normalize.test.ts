import { describe, expect, it } from "vitest";
import {
    normalizeCinema,
    normalizeMovie,
    sessionDateTime,
    ticketFormat,
} from "../normalize.ts";
import type { RawCinema, RawMovie, RawSession } from "../types.ts";

describe("scraper/cinemark/normalize", () => {
    const EXTRACTED_AT = "2026-11-21T12:00:00.000Z";

    describe("normalizeCinema", () => {
        it("normaliza un cine de Cinemark con coordenadas y comuna mapeada", () => {
            const raw: RawCinema = {
                id: 501,
                name: "Cinemark Alto Las Condes",
                address: "Av. Kennedy 9001, Las Condes",
                city: "Santiago",
                slug: "cinemark-alto-las-condes",
                latitude: "-33.3912",
                longitude: "-70.5462",
            };

            const normalizado = normalizeCinema(raw, EXTRACTED_AT);

            expect(normalizado).toEqual({
                id: "cinemark:501",
                origen: "cinemark",
                origenId: "501",
                extraidoEn: EXTRACTED_AT,
                nombre: "Cinemark Alto Las Condes",
                comuna: "Las Condes",
                ciudad: "Santiago",
                direccion: "Av. Kennedy 9001, Las Condes",
                logo: "/cinemark.png",
                url: "https://www.cinemark.cl/cartelera/cinemark-alto-las-condes",
                latitud: -33.3912,
                longitud: -70.5462,
            });
        });

        it("lanza error ante ID inválido", () => {
            const raw = { id: -1, name: "Inválido" } as unknown as RawCinema;
            expect(() => normalizeCinema(raw, EXTRACTED_AT)).toThrow(
                "Id de cine invalido.",
            );
        });
    });

    describe("normalizeMovie", () => {
        it("normaliza película con duración, sinopsis y trailer", () => {
            const raw: RawMovie = {
                corporateId: "m_100",
                slug: "dune-parte-dos",
                title: "Dune: Parte Dos",
                runTime: 166,
                genres: [{ name: "Ciencia ficción" }],
                rating: "TE+7",
                synopsis: "Paul Atreides se une a Chani y a los Fremen.",
                posterUrl: "https://cinemark.cl/posters/dune.jpg",
                trailerUrl: "https://youtube.com/watch?v=Way9Dexny3w",
            };

            const normalizada = normalizeMovie(raw, EXTRACTED_AT);

            expect(normalizada.id).toBe("cinemark:m_100");
            expect(normalizada.titulo).toBe("Dune: Parte Dos");
            expect(normalizada.duracion).toBe(166);
            expect(normalizada.genero).toBe("Ciencia ficción");
            expect(normalizada.clasificacion).toBe("TE+7");
            expect(normalizada.poster).toBe(
                "https://cinemark.cl/posters/dune.jpg",
            );
        });

        it("lanza error ante duración menor o igual a cero", () => {
            const raw = {
                corporateId: "m1",
                runTime: 0,
            } as unknown as RawMovie;
            expect(() => normalizeMovie(raw, EXTRACTED_AT)).toThrow(
                "Duracion de pelicula invalida.",
            );
        });
    });

    describe("sessionDateTime", () => {
        it("extrae fecha, hora y fechaCartelera", () => {
            const session = {
                sessionDateTime: "2026-11-25T18:45:00",
            } as RawSession;

            const res = sessionDateTime(session);
            expect(res.fecha).toBe("2026-11-25");
            expect(res.horario).toBe("18:45");
        });
    });

    describe("ticketFormat", () => {
        it("genera resumen de formato según formato de sesión y título de ticket", () => {
            const formato = ticketFormat("XD 2D", "Entrada General XD");
            expect(formato).toContain("XD");
        });
    });
});
