import { describe, expect, it } from "vitest";
import { validarScrapeResult } from "../validate.ts";
import type { ScrapeResult } from "../types.ts";

describe("validarScrapeResult", () => {
    const buildValido = (): ScrapeResult => ({
        meta: {
            origen: "cinemark",
            completo: true,
            desde: "2026-11-21",
            cinesSeleccionados: 1,
            cinesProcesados: 1,
            version: 1,
            dias: 7,
            limitePorCine: null,
            iniciadoEn: "",
            sesionesConsultadas: 0,
            moneda: "CLP",
            zonaHoraria: "America/Santiago",
            precioIncluyeServicio: false,
        },
        cines: [
            {
                id: "cinemark:10",
                origen: "cinemark",
                origenId: "10",
                extraidoEn: "2026-11-21T12:00:00.000Z",
                nombre: "Cinemark Alto Las Condes",
                comuna: "Las Condes",
                ciudad: "Santiago",
                direccion: "Av. Kennedy 9001",
                logo: "",
                url: "",
            },
        ],
        peliculas: [
            {
                id: "cinemark:m1",
                origen: "cinemark",
                origenId: "m1",
                extraidoEn: "2026-11-21T12:00:00.000Z",
                titulo: "Avatar 3",
                duracion: 180,
                genero: "Ciencia ficción",
                clasificacion: "TE",
                sinopsis: "Sinopsis de prueba.",
                poster: "https://ejemplo.com/poster.jpg",
            },
        ],
        horarios: [
            {
                id: "cinemark:s1",
                origen: "cinemark",
                origenId: "s1",
                extraidoEn: "2026-11-21T12:00:00.000Z",
                peliculaId: "cinemark:m1",
                cineId: "cinemark:10",
                sesionId: "ses_1",
                fecha: "2026-11-22",
                fechaCartelera: "2026-11-22",
                horario: "19:00:00",
                formatoResumen: "2D",
                idioma: "Doblada",
                sala: "Sala 1",
                agotada: false,
                revision: "rev1",
            },
        ],
        incidencias: [],
        funciones: [],
    });

    it("pasa la validación para un resultado de scraping bien estructurado", () => {
        const datos = buildValido();
        expect(() => validarScrapeResult(datos)).not.toThrow();
    });

    it("falla si el valor no es un objeto o faltan listas obligatorias", () => {
        expect(() => validarScrapeResult(null)).toThrow(
            "El JSON no contiene un objeto de scraping válido.",
        );
        expect(() => validarScrapeResult({})).toThrow(
            "El JSON no contiene todas las listas obligatorias.",
        );
    });

    it("falla si los metadatos tienen un origen desconocido o números inconsistentes", () => {
        const datos = buildValido();
        (datos.meta as any).origen = "desconocido";
        expect(() => validarScrapeResult(datos)).toThrow(
            "Los metadatos del scraping son inválidos o inconsistentes.",
        );

        const datosInconsistentes = buildValido();
        datosInconsistentes.meta.cinesProcesados = 5;
        datosInconsistentes.meta.cinesSeleccionados = 2; // procesados > seleccionados
        expect(() => validarScrapeResult(datosInconsistentes)).toThrow(
            "Los metadatos del scraping son inválidos o inconsistentes.",
        );
    });

    it("falla si un cine no contiene campos obligatorios", () => {
        const datos = buildValido();
        (datos.cines[0] as any).nombre = 12345; // tipo incorrecto
        expect(() => validarScrapeResult(datos)).toThrow(
            "Cine cinemark:10: datos obligatorios inválidos.",
        );
    });

    it("falla si una película tiene duración menor a 30 minutos o trailer inválido", () => {
        const datos = buildValido();
        datos.peliculas[0].duracion = 15;
        expect(() => validarScrapeResult(datos)).toThrow(
            "Película cinemark:m1: datos obligatorios inválidos.",
        );

        const datosTrailerInvalido = buildValido();
        datosTrailerInvalido.peliculas[0].duracion = 120;
        datosTrailerInvalido.peliculas[0].trailerUrl = "ftp://invalido.mp4";
        expect(() => validarScrapeResult(datosTrailerInvalido)).toThrow(
            "Película cinemark:m1: enlace de trailer invalido.",
        );
    });

    it("falla si un horario tiene butacas inconsistentes", () => {
        const datos = buildValido();
        datos.horarios[0].butacas = {
            disponibles: 100,
            total: 50, // total < disponibles
            consultadasEn: new Date().toISOString(),
        };
        expect(() => validarScrapeResult(datos)).toThrow(
            "disponibilidad de butacas invalida.",
        );
    });
});
