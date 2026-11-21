import { describe, expect, it } from "vitest";
import type { Pelicula } from "../types/types";
import { seleccionarDestacadasConCategoria } from "./seleccionarDestacadas";

function pelicula(
    id: string,
    datos: Partial<Omit<Pelicula, "id">> = {},
): Pelicula {
    return {
        id,
        titulo: id,
        duracion: 100,
        genero: "Drama",
        clasificacion: "TE",
        sinopsis: "",
        poster: "/poster.webp",
        estadoEstreno: "cartelera",
        ...datos,
    };
}

const opciones = {
    hoy: "2026-11-21",
    rng: () => 0,
    mezclarOrden: false,
};

describe("seleccionarDestacadasConCategoria", () => {
    it("reserva cupos para un estreno reciente y una preventa esperada", () => {
        const estreno = pelicula("Estreno", {
            fechaEstreno: "2026-11-14",
            banner: "/estreno.webp",
        });
        const preventa = pelicula("Preventa", {
            estadoEstreno: "preventa",
            totalFavoritos: 5,
            banner: "/preventa.webp",
        });
        const favorita = pelicula("Favorita", { totalFavoritos: 30 });

        const seleccion = seleccionarDestacadasConCategoria(
            [favorita, estreno, preventa],
            { ...opciones, limite: 2 },
        );

        expect(
            seleccion.map(({ pelicula, categoria }) => [
                pelicula.id,
                categoria,
            ]),
        ).toEqual([
            ["Estreno", "estrenos_recientes"],
            ["Preventa", "preventas_esperadas"],
        ]);
    });

    it("rellena los cupos con películas únicas y excluye conciertos y próximos estrenos", () => {
        const seleccion = seleccionarDestacadasConCategoria(
            [
                pelicula("Duplicada"),
                pelicula("Duplicada", { totalFavoritos: 10 }),
                pelicula("Respaldo"),
                pelicula("En vivo", {
                    genero: "Drama, K-pop",
                    totalFavoritos: 50,
                }),
                pelicula("Futura", {
                    estadoEstreno: "proximamente",
                    totalFavoritos: 60,
                }),
            ],
            { ...opciones, limite: 4 },
        );

        expect(
            seleccion.map(({ pelicula, categoria }) => [
                pelicula.id,
                categoria,
            ]),
        ).toEqual([
            ["Duplicada", "favoritas"],
            ["Respaldo", "destacada"],
        ]);
    });

    it("permite seleccionar a cualquiera de las películas empatadas en favoritos", () => {
        const catalogo = [
            pelicula("Alameda", { totalFavoritos: 10 }),
            pelicula("Bosque", { totalFavoritos: 10 }),
            pelicula("Costa", { totalFavoritos: 9 }),
        ];

        const seleccionarUna = (rng: () => number) =>
            seleccionarDestacadasConCategoria(catalogo, {
                ...opciones,
                rng,
                limite: 1,
            })[0];

        expect(seleccionarUna(() => 0)).toMatchObject({
            pelicula: { id: "Alameda" },
            categoria: "favoritas",
        });
        expect(seleccionarUna(() => 0.99)).toMatchObject({
            pelicula: { id: "Bosque" },
            categoria: "favoritas",
        });
    });
});
