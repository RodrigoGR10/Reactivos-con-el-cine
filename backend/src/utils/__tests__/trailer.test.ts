import { describe, expect, it } from "vitest";
import { normalizarTrailerUrl } from "../trailer.ts";

describe("normalizarTrailerUrl", () => {
    it("convierte un YouTube Video ID de 11 caracteres a URL canónica", () => {
        expect(normalizarTrailerUrl("dQw4w9WgXcQ")).toBe(
            "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        );
    });

    it("normaliza enlaces estándar de youtube.com/watch", () => {
        expect(
            normalizarTrailerUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
        ).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    });

    it("normaliza enlaces acortados youtu.be", () => {
        expect(normalizarTrailerUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(
            "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        );
    });

    it("normaliza enlaces de tipo embed, shorts y live", () => {
        expect(
            normalizarTrailerUrl(
                "https://www.youtube-nocookie.com/embed/WMr3-ShzB08?modestbranding=1&rel=0",
            ),
        ).toBe("https://www.youtube.com/watch?v=WMr3-ShzB08");
        expect(
            normalizarTrailerUrl(
                "https://youtube.com/shorts/RU_wMX_9SRE?si=FoCrJg0ZX5iVfGbP",
            ),
        ).toBe("https://www.youtube.com/watch?v=RU_wMX_9SRE");
        expect(
            normalizarTrailerUrl(
                "https://www.youtube.com/live/WX7BnbPV9F4?si=CLYNBfaZEpM_dF6v",
            ),
        ).toBe("https://www.youtube.com/watch?v=WX7BnbPV9F4");
    });

    it("soporta URLs sin protocolo '//'", () => {
        expect(
            normalizarTrailerUrl("//www.youtube.com/watch?v=dQw4w9WgXcQ"),
        ).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    });

    it("soporta archivos mp4 alojados en Cinepólis", () => {
        const cinepolisUrl =
            "https://pimcore-content.cinepolis.com/assets/Chile/Tickets/Movies/SpiderManUnNuevoDia_copy/Es/6a19e4cd4cc01-spider-man-brand-new-day.mp4";
        expect(normalizarTrailerUrl(cinepolisUrl)).toBe(cinepolisUrl);
    });

    //La url no va a ninguna parte, solo es para ver si ignora los fragmentos
    it("ignora fragmentos hash en trailers de Cinepólis", () => {
        const conHash =
            "https://pimcore-content.cinepolis.com/trailers/trailer.mp4#t=10";
        expect(normalizarTrailerUrl(conHash)).toBe(
            "https://pimcore-content.cinepolis.com/trailers/trailer.mp4",
        );
    });

    it("retorna undefined para entradas inválidas o maliciosas", () => {
        expect(normalizarTrailerUrl("")).toBeUndefined();
        expect(normalizarTrailerUrl("   ")).toBeUndefined();
        expect(normalizarTrailerUrl(null)).toBeUndefined();
        expect(normalizarTrailerUrl(12345)).toBeUndefined();
        expect(normalizarTrailerUrl("javascript:alert(1)")).toBeUndefined();
        expect(
            normalizarTrailerUrl(
                "https://user:pass@youtube.com/watch?v=dQw4w9WgXcQ",
            ),
        ).toBeUndefined();
        expect(
            normalizarTrailerUrl(
                "https://youtube.com:8080/watch?v=dQw4w9WgXcQ",
            ),
        ).toBeUndefined();
        expect(
            normalizarTrailerUrl("https://vimeo.com/123456"),
        ).toBeUndefined();
    });
});
