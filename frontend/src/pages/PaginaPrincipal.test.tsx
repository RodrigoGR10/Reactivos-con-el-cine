// @vitest-environment jsdom
import { HeadlessMantineProvider } from "@mantine/core";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../context/AuthContext";
import { FavoritesProvider } from "../context/FavoritesContext";
import { usePeliculas } from "../hooks/usePelicula";
import type { Pelicula } from "../types/types";
import PaginaPrincipal from "./PaginaPrincipal";

vi.mock("../hooks/usePelicula", () => ({ usePeliculas: vi.fn() }));
vi.mock("../services/authService", () => ({
    default: { getCurrentUser: async () => null },
}));
vi.mock("../components/recomendador/RecomendadorPeliculas", () => ({
    default: () => null,
}));

const datosComunes = { clasificacion: "TE", sinopsis: "", poster: "" };
const peliculas: Pelicula[] = [
    {
        ...datosComunes,
        id: "1",
        titulo: "Órbita",
        genero: "Drama",
        duracion: 100,
    },
    {
        ...datosComunes,
        id: "2",
        titulo: "El viaje",
        genero: "Drama",
        duracion: 101,
    },
    {
        ...datosComunes,
        id: "3",
        titulo: "La risa",
        genero: "Comedia",
        duracion: 90,
    },
];

function renderCartelera() {
    const user = userEvent.setup();
    render(
        <HeadlessMantineProvider env="test">
            <MemoryRouter>
                <AuthProvider>
                    <FavoritesProvider>
                        <PaginaPrincipal />
                    </FavoritesProvider>
                </AuthProvider>
            </MemoryRouter>
        </HeadlessMantineProvider>,
    );
    return user;
}

function enlacesCartelera() {
    return within(screen.getByRole("region", { name: "Cartelera" }))
        .getAllByRole("link")
        .map((enlace) => enlace.textContent);
}

describe("Búsqueda y filtros de cartelera", () => {
    beforeEach(() => {
        vi.mocked(usePeliculas).mockReturnValue({
            peliculas,
            peliculasDestacadas: [],
            cargando: false,
            error: null,
        });
        vi.stubGlobal("matchMedia", (query: string) =>
            Object.assign(new EventTarget(), { matches: false, media: query }),
        );
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("busca por título sin distinguir tildes ni mayúsculas y recupera la lista al borrar", async () => {
        const user = renderCartelera();
        const buscador = screen.getByRole("searchbox", {
            name: "Buscar una película",
        });

        await user.type(buscador, "ORBITA");
        expect(enlacesCartelera()).toEqual(["Órbita"]);

        await user.type(buscador, " inexistente");
        expect(screen.getByRole("status")).toHaveTextContent(
            "No encontramos películas que coincidan con tu búsqueda y filtros.",
        );
        expect(
            screen.queryByRole("region", { name: "Cartelera" }),
        ).not.toBeInTheDocument();

        await user.click(
            screen.getByRole("button", { name: "Borrar búsqueda" }),
        );
        expect(buscador).toHaveValue("");
        expect(enlacesCartelera()).toEqual(["Órbita", "El viaje", "La risa"]);
    });

    it("combina género y duración y permite retirar solo uno de los filtros", async () => {
        const user = renderCartelera();
        await user.click(
            screen.getByRole("button", { name: /filtrar por géneros/i }),
        );
        await user.click(
            await screen.findByRole("checkbox", { name: "Drama" }),
        );
        await user.click(screen.getByRole("button", { name: "Listo" }));
        expect(enlacesCartelera()).toEqual(["Órbita", "El viaje"]);

        await user.click(
            screen.getByRole("button", { name: /filtrar por duración/i }),
        );
        await user.click(
            await screen.findByRole("option", { name: "Hasta 100 min" }),
        );
        expect(enlacesCartelera()).toEqual(["Órbita"]);

        await user.click(
            screen.getByRole("button", {
                name: /quitar filtro de género: drama/i,
            }),
        );
        expect(enlacesCartelera()).toEqual(["Órbita", "La risa"]);
    });
});
