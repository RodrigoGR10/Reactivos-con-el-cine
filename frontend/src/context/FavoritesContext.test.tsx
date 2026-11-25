// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BotonFavorito } from "../components/common/BotonFavorito";
import profileService from "../services/profileService";
import { useAuth } from "./AuthContext";
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
const otraPeliculaId = "pelicula-2";
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
                activo={isFavoriteMovie(otraPeliculaId)}
                ariaLabel="Otra película favorita"
                onClick={() => void toggleFavoriteMovie(otraPeliculaId)}
            />
            <BotonFavorito
                activo={isFavoriteCinema(cineId)}
                ariaLabel={etiquetaCine}
                onClick={() => toggleFavoriteCinema(cineId)}
            />
        </>
    );
}

function vistaFavoritos() {
    return (
        <MemoryRouter>
            <FavoritesProvider>
                <ControlesDeFavoritos />
            </FavoritesProvider>
        </MemoryRouter>
    );
}

function renderFavoritos() {
    render(vistaFavoritos());
    return userEvent.setup();
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

    it.each([false, true])(
        "conserva el segundo cambio cuando el primero responde tarde (falla: %s)",
        async (falla) => {
            vi.spyOn(console, "error").mockImplementation(() => {});
            let confirmarPrimera!: (ids: string[]) => void;
            let rechazarPrimera!: (error: Error) => void;
            let confirmarSegunda!: (ids: string[]) => void;
            const primera = new Promise<string[]>((resolve, reject) => {
                confirmarPrimera = resolve;
                rechazarPrimera = reject;
            });
            const segunda = new Promise<string[]>((resolve) => {
                confirmarSegunda = resolve;
            });
            favoritos.toggleFavoriteMovie
                .mockReturnValueOnce(primera)
                .mockReturnValueOnce(segunda);

            const user = renderFavoritos();
            const boton = await screen.findByRole("button", {
                name: etiquetaPelicula,
            });
            const otroBoton = screen.getByRole("button", {
                name: "Otra película favorita",
            });
            await user.click(boton);
            await user.click(otroBoton);

            await act(() => {
                confirmarSegunda(
                    falla ? [otraPeliculaId] : [peliculaId, otraPeliculaId],
                );
            });
            await act(() => {
                if (falla)
                    rechazarPrimera(new Error("No se guardó la película"));
                else confirmarPrimera([peliculaId]);
            });

            expect(boton).toHaveAttribute("aria-pressed", String(!falla));
            expect(otroBoton).toHaveAttribute("aria-pressed", "true");
        },
    );

    it("ignora una respuesta pendiente de la cuenta anterior", async () => {
        let confirmar!: (ids: string[]) => void;
        favoritos.toggleFavoriteMovie.mockReturnValueOnce(
            new Promise<string[]>((resolve) => {
                confirmar = resolve;
            }),
        );
        const sesion = useAuth();
        const cuentaInicial = sesion.user;
        const user = userEvent.setup();
        const { rerender } = render(vistaFavoritos());

        try {
            const boton = await screen.findByRole("button", {
                name: etiquetaPelicula,
            });
            await user.click(boton);
            expect(boton).toHaveAttribute("aria-pressed", "true");

            sesion.user = { ...cuentaInicial!, id: "2" };
            rerender(vistaFavoritos());
            await screen.findByRole("button", {
                name: etiquetaPelicula,
                pressed: false,
            });

            await act(() => {
                confirmar([peliculaId]);
            });
            expect(
                screen.getByRole("button", { name: etiquetaPelicula }),
            ).toHaveAttribute("aria-pressed", "false");
        } finally {
            sesion.user = cuentaInicial;
        }
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

    it("evita duplicar una eliminación pendiente y restaura el cine si falla", async () => {
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
        await user.click(boton);
        expect(favoritos.toggleFavoriteCinema).toHaveBeenCalledExactlyOnceWith(
            cineId,
        );
        expect(boton).toHaveAttribute("aria-pressed", "false");

        await act(() => {
            rechazarEliminacion(
                new Error("No se pudo actualizar el favorito."),
            );
        });

        expect(boton).toHaveAttribute("aria-pressed", "true");
    });
});
