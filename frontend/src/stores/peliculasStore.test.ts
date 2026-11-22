
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

import peliculaService from "../services/peliculas";
import type { Pelicula } from "../types/types";
import { usePeliculasStore } from "./peliculasStore";

vi.mock("../services/peliculas", () => ({
    default: {
        getCartelera: vi.fn(),
    },
}));

const pelicula: Pelicula = {
    id: "1",
    titulo: "Órbita Austral",
    duracion: 100,
    genero: "Drama",
    clasificacion: "TE",
    sinopsis: "Película de prueba",
    poster: "",
    estadoEstreno: "cartelera",
};

const peliculaProximamente: Pelicula = {
    id: "2",
    titulo: "El futuro",
    duracion: 110,
    genero: "Ciencia ficción",
    clasificacion: "TE",
    sinopsis: "Película de prueba",
    poster: "",
    estadoEstreno: "proximamente",
};

beforeEach(() => {
    vi.resetAllMocks();

    usePeliculasStore.setState({
        peliculas: [],
        cargando: true,
        isLoaded: false,
        error: null,
    });
});

describe("peliculasStore", () => {
    it("carga y conserva las películas del backend", async () => {
        vi.mocked(peliculaService.getCartelera).mockResolvedValue([
            pelicula,
            peliculaProximamente,
        ]);

        await usePeliculasStore.getState().cargarPeliculas();

        expect(
            usePeliculasStore.getState().peliculas,
        ).toEqual([pelicula, peliculaProximamente]);

        expect(
            usePeliculasStore.getState().isLoaded,
        ).toBe(true);

        expect(
            usePeliculasStore.getState().cargando,
        ).toBe(false);
    });

    it("no vuelve a consultar si el catálogo ya está cargado", async () => {
        vi.mocked(peliculaService.getCartelera).mockResolvedValue([
            pelicula,
        ]);

        await usePeliculasStore.getState().cargarPeliculas();
        await usePeliculasStore.getState().cargarPeliculas();

        expect(
            peliculaService.getCartelera,
        ).toHaveBeenCalledTimes(1);
    });

    it("guarda un error cuando falla la petición", async () => {
        vi.mocked(
            peliculaService.getCartelera,
        ).mockRejectedValue(new Error("Error de conexión"));

        await usePeliculasStore.getState().cargarPeliculas();

        expect(
            usePeliculasStore.getState().error,
        ).toBe("No se pudieron cargar las películas.");

        expect(
            usePeliculasStore.getState().cargando,
        ).toBe(false);

        expect(
            usePeliculasStore.getState().isLoaded,
        ).toBe(false);
    });
});
