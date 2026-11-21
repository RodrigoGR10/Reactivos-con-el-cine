import { describe, expect, it } from "vitest";
import { butacasPublicas, CACHE_BUTACAS_MS } from "../estadoButacas.ts";
import type { ScheduleRow } from "../preciosFunciones/types.ts";

describe("butacasPublicas", () => {
    const buildRow = (overrides: Partial<ScheduleRow> = {}): ScheduleRow => ({
        id: 1,
        origen_id: "cinemark:1",
        pelicula_id: 1,
        cine_id: "c1",
        origen: "cinemark",
        pelicula_origen_id: "m10",
        pelicula_url: null,
        sesion_id: "s1",
        fecha: "2026-11-21",
        horario: "20:00:00",
        fecha_cartelera: "2026-11-21",
        formato_resumen: "2D",
        idioma: "Doblada",
        sala: "Sala 1",
        agotada: false,
        url_compra: null,
        revision: "rev123",
        precios_revision: null,
        precios_consultados_en: null,
        precios_error_revision: null,
        precios_error_hasta: null,
        consulta_precios_revision: null,
        consulta_precios_hasta: null,
        consulta_precios_token: null,
        butacas_disponibles: 40,
        butacas_total: 100,
        butacas_consultadas_en: new Date(),
        butacas_revision: "rev123",
        butacas_actualizadas_en: new Date(),
        butacas_error_hasta: null,
        butacas_error_revision: null,
        cine_origen_id: "10",
        cine_nombre: "Cinemark",
        cine_url: null,
        pelicula_url_fuente: null,
        pelicula_origen_id_fuente: "m10",
        ...overrides,
    });

    it("retorna estado 'disponible' y porcentaje de ocupación cuando los datos son vigentes", () => {
        const row = buildRow({
            butacas_disponibles: 25,
            butacas_total: 100,
            butacas_actualizadas_en: new Date(Date.now() - 30_000),
        });

        const resultado = butacasPublicas(row);

        expect(resultado.estadoButacas).toBe("disponible");
        expect(resultado.butacas?.disponibles).toBe(25);
        expect(resultado.butacas?.total).toBe(100);
        // (1 - 25/100) = 75%
        expect(resultado.butacas?.porcentajeNoDisponible).toBe(75);
    });

    it("retorna estado 'desactualizado' cuando los datos existen pero expiró el tiempo de caché", () => {
        const row = buildRow({
            butacas_actualizadas_en: new Date(
                Date.now() - (CACHE_BUTACAS_MS + 10_000),
            ),
        });

        const resultado = butacasPublicas(row);

        expect(resultado.estadoButacas).toBe("desactualizado");
        expect(resultado.butacas).toBeDefined();
    });

    it("retorna estado 'error' cuando la revisión coincide con error y la ventana de error está activa", () => {
        const row = buildRow({
            butacas_disponibles: null,
            butacas_actualizadas_en: null,
            butacas_error_revision: "rev123",
            butacas_error_hasta: new Date(Date.now() + 60_000),
        });

        const resultado = butacasPublicas(row);

        expect(resultado.estadoButacas).toBe("error");
        expect(resultado.butacas).toBeUndefined();
    });

    it("retorna estado 'pendiente' cuando no hay datos de butacas ni error vigente", () => {
        const row = buildRow({
            butacas_disponibles: null,
            butacas_total: null,
            butacas_consultadas_en: null,
            butacas_actualizadas_en: null,
        });

        const resultado = butacasPublicas(row);

        expect(resultado.estadoButacas).toBe("pendiente");
        expect(resultado.butacas).toBeUndefined();
    });
});
