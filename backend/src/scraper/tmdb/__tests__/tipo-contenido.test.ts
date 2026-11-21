import { describe, expect, it } from "vitest";
import { detectarTipoContenido } from "../tipo-contenido.ts";

describe("detectarTipoContenido", () => {
    it("identifica conciertos y presentaciones en vivo", () => {
        expect(detectarTipoContenido("BTS: Yet To Come in Cinemas")).toBe(
            "CONCIERTO",
        );
        expect(detectarTipoContenido("Blackpink World Tour Live Viewing")).toBe(
            "CONCIERTO",
        );
        expect(detectarTipoContenido("Ozzy Osbourne: Live at Budokan")).toBe(
            "CONCIERTO",
        );
        expect(detectarTipoContenido("Coldplay Live Concert")).toBe(
            "CONCIERTO",
        );
    });

    it("identifica aniversarios y reestrenos especiales", () => {
        expect(detectarTipoContenido("Coraline: 15° Aniversario")).toBe(
            "ANIVERSARIO",
        );
        expect(
            detectarTipoContenido(
                "El Señor de los Anillos: 20 Years Anniversary",
            ),
        ).toBe("ANIVERSARIO");
        expect(detectarTipoContenido("Matrix 25th Anniversary")).toBe(
            "ANIVERSARIO",
        );
    });

    it("identifica eventos especiales y fan meetings", () => {
        expect(detectarTipoContenido("Demon Slayer: Cheering Party")).toBe(
            "EVENTO",
        );
        expect(detectarTipoContenido("Jujutsu Kaisen Fan Event")).toBe(
            "EVENTO",
        );
    });

    it("clasifica como DESCONOCIDO películas estándar de cartelera", () => {
        expect(detectarTipoContenido("Oppenheimer")).toBe("DESCONOCIDO");
        expect(detectarTipoContenido("Gladiador II")).toBe("DESCONOCIDO");
        expect(detectarTipoContenido("Intensamente 2")).toBe("DESCONOCIDO");
    });
});
