import { describe, expect, it, vi } from "vitest";
import {
    buscarTrailerEspanol,
    coincideTituloTrailer,
    type VideoTrailer,
} from "../trailers.ts";

const doomsday = "Avengers: Doomsday";
const videoCorrecto = "Doomsday123";
const videoIncorrecto = "Infinity123";
const url = (id: string) => `https://www.youtube.com/watch?v=${id}`;

describe("correspondencia entre tráiler y película", () => {
    it("exige el subtítulo completo y admite diferencias de puntuación", () => {
        expect(
            coincideTituloTrailer("Avengers: Infinity War - Official Trailer", [
                doomsday,
            ]),
        ).toBe(false);
        expect(
            coincideTituloTrailer("AVENGERS — DOOMSDAY | Tráiler", [doomsday]),
        ).toBe(true);
        expect(
            coincideTituloTrailer("Avengers Doomsdayers | Tráiler", [doomsday]),
        ).toBe(false);
    });

    it.each([
        ["IT CHAPTER TWO | OFFICIAL TRAILER", false],
        ["Watch it now | Official Trailer", false],
        ["IT | Official Trailer", true],
        ["It (2017) - Tráiler oficial", true],
    ])("comprueba si %s identifica la película It", (nombre, coincide) => {
        expect(coincideTituloTrailer(nombre, ["It"])).toBe(coincide);
    });

    it("acepta el título original o el localizado completo", async () => {
        const consultarYoutube = vi
            .fn()
            .mockResolvedValue({ title: "LEÓN: Tráiler oficial" });
        const resultado = await buscarTrailerEspanol(
            "El profesional",
            url(videoCorrecto),
            {
                title: "El profesional",
                original_title: "Léon",
            },
            consultarYoutube,
        );
        expect(resultado?.url).toBe(url(videoCorrecto));
    });

    it("reconoce una traducción registrada en la ficha de TMDB", async () => {
        const consultarYoutube = vi.fn().mockResolvedValue({
            title: "The Match | Official Trailer",
        });
        const resultado = await buscarTrailerEspanol(
            "El Partido",
            url(videoCorrecto),
            {
                original_title: "El Partido",
                translations: {
                    translations: [{ data: { title: "The Match" } }],
                },
            },
            consultarYoutube,
        );
        expect(resultado?.url).toBe(url(videoCorrecto));
    });

    it("rechaza un enlace del cine hacia otra película de la saga", async () => {
        const consultarYoutube = vi.fn().mockResolvedValue({
            title: "Avengers: Infinity War | Tráiler latino",
        });
        await expect(
            buscarTrailerEspanol(
                doomsday,
                url(videoIncorrecto),
                {},
                consultarYoutube,
            ),
        ).resolves.toBeUndefined();
        expect(consultarYoutube).toHaveBeenCalledWith(url(videoIncorrecto));
    });

    it.each([
        { idioma: "es", pais: "MX", version: "doblado" },
        { idioma: "es", pais: "ES", version: "doblado" },
        { idioma: "en", pais: "US", version: "original" },
    ])(
        "descarta la URL equivocada de TMDB y conserva la versión $idioma-$pais",
        async ({ idioma, pais, version }) => {
            const videoBase: Omit<VideoTrailer, "key" | "published_at"> = {
                site: "YouTube",
                type: "Trailer",
                name: "Official Trailer",
                official: true,
                iso_639_1: idioma,
                iso_3166_1: pais,
            };
            const consultarYoutube = vi.fn(async (enlace: string) => ({
                title:
                    enlace === url(videoIncorrecto)
                        ? "Avengers: Infinity War | Official Trailer"
                        : "Avengers: Doomsday | Official Trailer",
            }));
            const resultado = await buscarTrailerEspanol(
                doomsday,
                null,
                {
                    original_language: "en",
                    videos: {
                        results: [
                            {
                                ...videoBase,
                                key: videoIncorrecto,
                                published_at: "2026-01-02",
                            },
                            {
                                ...videoBase,
                                key: videoCorrecto,
                                published_at: "2026-01-01",
                            },
                        ],
                    },
                },
                consultarYoutube,
            );
            expect(consultarYoutube).toHaveBeenNthCalledWith(
                1,
                url(videoIncorrecto),
            );
            expect(resultado).toMatchObject({
                url: url(videoCorrecto),
                version,
            });
        },
    );
});
