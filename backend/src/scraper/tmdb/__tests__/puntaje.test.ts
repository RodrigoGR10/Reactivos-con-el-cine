import { describe, expect, it } from "vitest";
import { esCoincidenciaExacta, scoreCandidate } from "../puntaje.ts";
import type { TmdbMovieResult } from "../types.ts";
import { parseMovieTitleForSearch } from "../consulta.ts";

describe("scraper/tmdb/puntaje", () => {
    describe("esCoincidenciaExacta", () => {
        it("retorna true si el título o título original coincide exactamente con la consulta normalizada", () => {
            const candidate: TmdbMovieResult = {
                id: 1,
                title: "Dune: Part Two",
                original_title: "Dune: Part Two",
                overview: "",
                poster_path: "",
                backdrop_path: "",
            };

            expect(esCoincidenciaExacta(candidate, "Dune Part Two")).toBe(true);
            expect(esCoincidenciaExacta(candidate, "dune: part two")).toBe(
                true,
            );
        });

        it("retorna false si no coincide exactamente", () => {
            const candidate: TmdbMovieResult = {
                id: 1,
                title: "Dune",
                original_title: "Dune",
                overview: "",
                poster_path: "",
                backdrop_path: "",
            };

            expect(esCoincidenciaExacta(candidate, "Dune 2")).toBe(false);
        });
    });

    describe("scoreCandidate", () => {
        it("asigna puntuación alta (>=60) para coincidencias exactas de título y año", () => {
            const candidate: TmdbMovieResult = {
                id: 438631,
                title: "Dune",
                original_title: "Dune",
                release_date: "2021-09-15",
                vote_count: 10000,
                popularity: 150,
                overview: "",
                poster_path: "",
                backdrop_path: "",
            };

            const parsed = parseMovieTitleForSearch("Dune (2021)");
            const targetTitles = ["Dune"];

            const { score, bestTitleScore } = scoreCandidate(
                candidate,
                targetTitles,
                parsed,
            );

            expect(bestTitleScore).toBe(60);
            expect(score).toBeGreaterThan(70);
        });

        it("penaliza candidatos con números contradictorios en el título", () => {
            const candidateParte1: TmdbMovieResult = {
                id: 10,
                title: "Gladiador 1",
                original_title: "Gladiator 1",
                release_date: "2000-05-01",
                overview: "",
                poster_path: "",
                backdrop_path: "",
            };

            const parsed = parseMovieTitleForSearch("Gladiador 2");
            const targetTitles = ["Gladiador 2"];

            const { score } = scoreCandidate(
                candidateParte1,
                targetTitles,
                parsed,
            );

            expect(score).toBeLessThan(40);
        });
    });
});
