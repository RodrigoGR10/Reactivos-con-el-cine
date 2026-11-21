import { describe, expect, it } from "vitest";
import { isCineId, isNumericId, isUuid } from "../../db.ts";

describe("db validators", () => {
    describe("isUuid", () => {
        it("valida correctamente UUIDs estándar", () => {
            expect(isUuid("123e4567-e89b-12d3-a456-426614174000")).toBe(true);
            expect(isUuid("123E4567-E89B-12D3-A456-426614174000")).toBe(true);
        });

        it("rechaza strings que no cumplen formato UUID", () => {
            expect(isUuid("")).toBe(false);
            expect(isUuid("not-a-uuid")).toBe(false);
            expect(isUuid("123e4567-e89b-12d3-a456-42661417400")).toBe(false); // muy corto
            expect(isUuid("123e4567-e89b-12d3-a456-426614174000-extra")).toBe(
                false,
            );
        });
    });

    describe("isCineId", () => {
        it("valida IDs de cines no vacíos dentro del límite", () => {
            expect(isCineId("cinemark:100")).toBe(true);
            expect(isCineId("cineplanet:mall-plaza")).toBe(true);
        });

        it("rechaza valores inválidos, vacíos o que excedan maxLength", () => {
            expect(isCineId("")).toBe(false);
            expect(isCineId(null)).toBe(false);
            expect(isCineId(1234)).toBe(false);
            expect(isCineId("a".repeat(101))).toBe(false);
            expect(isCineId("a".repeat(10), 5)).toBe(false);
        });
    });

    describe("isNumericId", () => {
        it("valida IDs enteros positivos tanto como número como string", () => {
            expect(isNumericId(1)).toBe(true);
            expect(isNumericId("42")).toBe(true);
            expect(isNumericId("2147483647")).toBe(true); // límite INT4 Postgres
        });

        it("rechaza ceros, negativos, decimales o números fuera de rango", () => {
            expect(isNumericId(0)).toBe(false);
            expect(isNumericId("0")).toBe(false);
            expect(isNumericId(-5)).toBe(false);
            expect(isNumericId("-5")).toBe(false);
            expect(isNumericId(3.14)).toBe(false);
            expect(isNumericId(2_147_483_648)).toBe(false); // excede INT4
            expect(isNumericId("abc")).toBe(false);
            expect(isNumericId("")).toBe(false);
        });
    });
});
