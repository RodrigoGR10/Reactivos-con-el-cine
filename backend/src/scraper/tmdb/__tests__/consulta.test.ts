import { describe, expect, it } from "vitest";
import {
    cleanPromotionalTitle,
    extractContentTokens,
    hasConflictingNumberTokens,
    levenshteinDistance,
    normalizeContentWords,
    normalizeNumberWords,
    normalizeTitleKey,
    parseMovieTitleForSearch,
    splitTitleBySeparator,
    stripLeadingArticle,
} from "../consulta.ts";

describe("scraper/tmdb/consulta", () => {
    describe("levenshteinDistance", () => {
        it("calcula correctamente la distancia entre dos palabras", () => {
            expect(levenshteinDistance("gato", "pato")).toBe(1);
            expect(levenshteinDistance("casa", "casa")).toBe(0);
            expect(levenshteinDistance("kitten", "sitting")).toBe(3);
            expect(levenshteinDistance("", "abc")).toBe(3);
        });
    });

    describe("cleanPromotionalTitle", () => {
        it("remueve etiquetas de formato como 4K, 3D, IMAX, XD", () => {
            expect(cleanPromotionalTitle("Avatar 3D")).toBe("Avatar");
            expect(cleanPromotionalTitle("Oppenheimer IMAX 4K")).toBe(
                "Oppenheimer",
            );
        });

        it("remueve años entre paréntesis y etiquetas de aniversario", () => {
            expect(cleanPromotionalTitle("Dune [2021]")).toBe("Dune");
            expect(cleanPromotionalTitle("Coraline 15 AÑOS")).toBe("Coraline");
            expect(cleanPromotionalTitle("Interstellar REESTRENO")).toBe(
                "Interstellar",
            );
        });
    });

    describe("stripLeadingArticle", () => {
        it("elimina artículos iniciales comunes en español e inglés", () => {
            expect(stripLeadingArticle("El Padrino")).toBe("Padrino");
            expect(stripLeadingArticle("La La Land")).toBe("La Land");
            expect(stripLeadingArticle("The Avengers")).toBe("Avengers");
            expect(stripLeadingArticle("A Quiet Place")).toBe("Quiet Place");
        });
    });

    describe("normalizeTitleKey y normalizeNumberWords", () => {
        it("convierte números en palabras y remueve caracteres no alfanuméricos", () => {
            expect(normalizeNumberWords("Deadpool 2")).toBe("DEADPOOL 2");
            expect(normalizeTitleKey("Spider-Man: No Way Home!")).toBe(
                "SPIDERMANNOWAYHOME",
            );
        });
    });

    describe("splitTitleBySeparator", () => {
        it("divide el título en lado izquierdo y derecho ante separadores estándar", () => {
            const split = splitTitleBySeparator("Star Wars: A New Hope");
            expect(split.left).toBe("Star Wars");
            expect(split.right).toBe("A New Hope");
        });
    });

    describe("hasConflictingNumberTokens", () => {
        it("detecta conflicto si un lado tiene '2' y el otro '1'", () => {
            const tokensA = ["GLADIADOR", "2"];
            const candTokens = new Set(["GLADIADOR", "1"]);
            expect(hasConflictingNumberTokens(tokensA, candTokens)).toBe(true);
        });

        it("no marca conflicto si comparten el mismo número", () => {
            const tokensA = ["DUNE", "2"];
            const candTokens = new Set(["DUNE", "2"]);
            expect(hasConflictingNumberTokens(tokensA, candTokens)).toBe(false);
        });
    });

    describe("parseMovieTitleForSearch", () => {
        it("extrae año explícito y genera consultas de búsqueda en cascada", () => {
            const parsed = parseMovieTitleForSearch("Dune (2021)");
            expect(parsed.year).toBe(2021);
            expect(parsed.canonicalTitle).toBe("Dune");
            expect(parsed.queries.length).toBeGreaterThan(0);
        });
    });
});
