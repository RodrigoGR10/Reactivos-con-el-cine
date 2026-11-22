// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useUbicacion } from "./useUbicacion";

afterEach(() => vi.unstubAllGlobals());

it.each([
    [true, "sin-soporte"],
    [false, "conexion-insegura"],
] as const)(
    "distingue una API ausente en contexto seguro=%s",
    (seguro, estado) => {
        vi.stubGlobal("isSecureContext", seguro);
        vi.stubGlobal("navigator", { geolocation: undefined });
        const { result } = renderHook(useUbicacion);

        act(() => result.current.solicitar());

        expect(result.current.estado).toBe(estado);
        expect(result.current.ubicacion).toBeNull();

        act(() => result.current.descartarAviso());

        expect(result.current.estado).toBe("inactivo");
    },
);
