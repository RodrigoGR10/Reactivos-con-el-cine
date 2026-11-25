import { describe, expect, it } from "vitest";
import { fuentesAEstreno, serializarPelicula } from "../serializar.ts";
import type { FuenteRow, PeliculaRow } from "../tipos.ts";

describe("serializarPelicula", () => {
    const HOY = "2026-11-21";

    it("convierte fuentes SQL al formato esperado por clasificarEstreno", () => {
        const fuentesSQL: FuenteRow[] = [
            {
                estado_estreno: "proximamente",
                fecha_estreno: "2026-12-25",
                pelicula_id: 0,
                origen: "",
                origen_id: "",
            },
            {
                estado_estreno: null,
                fecha_estreno: null,
                pelicula_id: 0,
                origen: "",
                origen_id: "",
            },
        ];

        const resultado = fuentesAEstreno(fuentesSQL);

        expect(resultado).toEqual([
            { estadoEstreno: "proximamente", fechaEstreno: "2026-12-25" },
            { estadoEstreno: undefined, fechaEstreno: undefined },
        ]);
    });

    it("serializa una fila de película a camelCase con datos TMDb y extras", () => {
        const row: PeliculaRow = {
            id: 101,
            titulo: "Interstellar",
            titulo_original: "Interstellar",
            duracion: 169,
            genero: "Ciencia ficción",
            clasificacion: "TE+7",
            sinopsis:
                "Un equipo de exploradores viaja a través de un agujero de gusano.",
            poster: "https://ejemplo.com/poster.jpg",
            posterLimpio: "https://ejemplo.com/poster-clean.jpg",
            trailerUrl: "https://www.youtube.com/watch?v=zSWdZVtXT7E",
            trailerVersion: "doblado",
            banner: "https://ejemplo.com/banner.jpg",
            tmdb_id: 157336,
            calificacion_tmdb: 8.6,
            votos_tmdb: 34000,
            popularidad_tmdb: 120.5,
            fecha_estreno_tmdb: "2014-11-05",
        };

        const fuentes = [
            { estadoEstreno: "cartelera" as const, fechaEstreno: "2026-11-01" },
        ];
        const extras = { totalCines: 5, totalFunciones: 24 };

        const serializada = serializarPelicula(row, fuentes, HOY, extras);

        expect(serializada).toEqual({
            id: "101",
            titulo: "Interstellar",
            tituloOriginal: "Interstellar",
            duracion: 169,
            genero: "Ciencia ficción",
            clasificacion: "TE+7",
            sinopsis:
                "Un equipo de exploradores viaja a través de un agujero de gusano.",
            poster: "https://ejemplo.com/poster.jpg",
            posterLimpio: "https://ejemplo.com/poster-clean.jpg",
            trailerUrl: "https://www.youtube.com/watch?v=zSWdZVtXT7E",
            trailerVersion: "doblado",
            banner: "https://ejemplo.com/banner.jpg",
            tmdbId: 157336,
            calificacionTmdb: 8.6,
            votosTmdb: 34000,
            popularidadTmdb: 120.5,
            fechaEstrenoTmdb: "2014-11-05",
            estadoEstreno: "cartelera",
            fechaEstreno: "2026-11-01",
            totalCines: 5,
            totalFunciones: 24,
        });
    });

    it("omite campos nulos o no definidos y normaliza valores faltantes", () => {
        const rowMinima: PeliculaRow = {
            id: 202,
            titulo: "Película Indie",
            titulo_original: null,
            duracion: null,
            genero: null,
            clasificacion: "",
            sinopsis: "",
            poster: null,
            posterLimpio: null,
            trailerUrl: null,
            trailerVersion: null,
            banner: null,
            tmdb_id: null,
            calificacion_tmdb: null,
            votos_tmdb: null,
            popularidad_tmdb: null,
            fecha_estreno_tmdb: null,
        };

        const serializada = serializarPelicula(rowMinima, [], HOY);

        expect(serializada.id).toBe("202");
        expect(serializada.titulo).toBe("Película Indie");
        expect(serializada.tituloOriginal).toBeUndefined();
        expect(serializada.duracion).toBeNull();
        expect(serializada.genero).toBe("");
        expect(serializada.sinopsis).toBe("No hay sinopsis disponible.");
        expect(serializada.poster).toBe("");
        expect(serializada.tmdbId).toBeUndefined();
        expect(serializada.estadoEstreno).toBe("cartelera");
    });
});
