// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BotonFavorito } from "../components/common/BotonFavorito";
import profileService from "../services/profileService";
import { FavoritesProvider, useFavorites } from "./FavoritesContext";

vi.mock("./AuthContext", () => {
    const sesion = {
        user: { id: "1", nombre: "Ana", email: "ana@example.com" },
        invalidateSession: vi.fn(),
    };
    return { useAuth: () => sesion };
});

vi.mock("../services/profileService", () => ({
    default: {
        getFavorites: vi.fn(),
        toggleFavoriteMovie: vi.fn(),
        toggleFavoriteCinema: vi.fn(),
    },
}));

const favoritos = vi.mocked(profileService);
const peliculaId = "pelicula-1";
const cineId = "cine-1";
const etiquetaPelicula = "Película favorita";
const etiquetaCine = "Cine favorito";

function ControlesDeFavoritos() {
    const {
        isLoadingFavorites,
        isFavoriteMovie,
        isFavoriteCinema,
        toggleFavoriteMovie,
        toggleFavoriteCinema,
    } = useFavorites();

    if (isLoadingFavorites) return <p role="status">Cargando favoritos</p>;

    return (
        <>
            <BotonFavorito
                activo={isFavoriteMovie(peliculaId)}
                ariaLabel={etiquetaPelicula}
                onClick={() => void toggleFavoriteMovie(peliculaId)}
            />
            <BotonFavorito
                activo={isFavoriteCinema(cineId)}
                ariaLabel={etiquetaCine}
                onClick={() => toggleFavoriteCinema(cineId)}
            />
        </>
    );
}

function renderFavoritos() {
    const user = userEvent.setup();
    render(
        <MemoryRouter>
            <FavoritesProvider>
                <ControlesDeFavoritos />
            </FavoritesProvider>
        </MemoryRouter>,
    );
    return user;
}

describe("FavoritesProvider", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        favoritos.getFavorites.mockResolvedValue({
            peliculasFavoritas: [],
            cinesFavoritos: [cineId],
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("guarda una película y permite quitarla de favoritos", async () => {
        favoritos.toggleFavoriteMovie
            .mockResolvedValueOnce([peliculaId])
            .mockResolvedValueOnce([]);

        const user = renderFavoritos();
        const boton = await screen.findByRole("button", {
            name: etiquetaPelicula,
            pressed: false,
        });
        await user.click(boton);
        expect(boton).toHaveAttribute("aria-pressed", "true");

        await user.click(boton);
        expect(boton).toHaveAttribute("aria-pressed", "false");
        expect(favoritos.toggleFavoriteMovie.mock.calls).toEqual([
            [peliculaId],
            [peliculaId],
        ]);
    });

    it("carga un cine guardado y confirma su eliminación", async () => {
        favoritos.toggleFavoriteCinema.mockResolvedValueOnce([]);
        const user = renderFavoritos();
        const boton = await screen.findByRole("button", {
            name: etiquetaCine,
            pressed: true,
        });

        await user.click(boton);

        expect(boton).toHaveAttribute("aria-pressed", "false");
        expect(favoritos.toggleFavoriteCinema).toHaveBeenCalledExactlyOnceWith(
            cineId,
        );
    });

    it("restaura el cine guardado si falla la eliminación optimista", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        let rechazarEliminacion!: (error: Error) => void;
        favoritos.toggleFavoriteCinema.mockReturnValueOnce(
            new Promise<string[]>((_, reject) => {
                rechazarEliminacion = reject;
            }),
        );
        const user = renderFavoritos();
        const boton = await screen.findByRole("button", {
            name: etiquetaCine,
            pressed: true,
        });

        await user.click(boton);
        expect(boton).toHaveAttribute("aria-pressed", "false");

        await act(() => {
            rechazarEliminacion(
                new Error("No se pudo actualizar el favorito."),
            );
        });

        expect(boton).toHaveAttribute("aria-pressed", "true");
    });
});
