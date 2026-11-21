// @vitest-environment jsdom
import { HeadlessMantineProvider } from "@mantine/core";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../context/AuthContext";
import { FavoritesProvider } from "../context/FavoritesContext";
import cineService from "../services/cines";
import funcionesService from "../services/funciones";
import peliculaService from "../services/peliculas";
import type { Horario } from "../types/types";
import MovieDetailPage from "./MovieDetailPage";

vi.mock("../services/authService", () => ({
    default: { getCurrentUser: async () => null },
}));
vi.mock("../services/cines", () => ({ default: { getAll: vi.fn() } }));
vi.mock("../services/funciones", () => ({ default: { getHorarios: vi.fn() } }));
vi.mock("../services/peliculas", () => ({ default: { getById: vi.fn() } }));

const primerDia = "2035-07-17";
const segundoDia = "2035-07-18";

function horario(
    id: string,
    cineId: string,
    fecha: string,
    hora: string,
): Horario {
    return {
        id,
        cineId,
        fecha,
        fechaCartelera: fecha,
        horario: hora,
        peliculaId: "1",
        idioma: "Subtitulada",
        sala: "1",
        agotada: false,
        estadoPrecio: "pendiente",
        tarifas: [],
    };
}

function renderDetalle(busqueda = "") {
    const user = userEvent.setup();
    const router = createMemoryRouter(
        [
            {
                path: "/peliculas/:id",
                element: (
                    <FavoritesProvider>
                        <MovieDetailPage />
                    </FavoritesProvider>
                ),
            },
        ],
        { initialEntries: [`/peliculas/1${busqueda}`] },
    );
    render(
        <HeadlessMantineProvider env="test">
            <AuthProvider>
                <RouterProvider router={router} />
            </AuthProvider>
        </HeadlessMantineProvider>,
    );
    return { router, user };
}

describe("Horarios en el detalle de película", () => {
    beforeEach(() => {
        vi.mocked(peliculaService.getById).mockResolvedValue({
            id: "1",
            titulo: "Órbita",
            duracion: 100,
            genero: "Drama",
            clasificacion: "TE",
            sinopsis: "",
            poster: "",
        });
        vi.mocked(cineService.getAll).mockResolvedValue([
            { id: "alameda", nombre: "Cine Alameda", comuna: "Santiago" },
            { id: "plaza", nombre: "Cine Plaza", comuna: "Providencia" },
        ]);
        vi.mocked(funcionesService.getHorarios).mockResolvedValue([
            horario("3", "plaza", segundoDia, "21:00"),
            horario("1", "alameda", primerDia, "15:30"),
            horario("2", "alameda", primerDia, "18:00"),
        ]);
    });

    it("agrupa los horarios por cine y actualiza la URL al cambiar de fecha", async () => {
        const { router, user } = renderDetalle(
            "?fecha=2035-07-01&funcionId=1&hora=15%3A30",
        );
        await screen.findByRole("link", { name: "Cine Alameda" });
        const funciones = within(
            screen.getByRole("region", { name: "Funciones" }),
        );
        const grupoAlameda = within(funciones.getByRole("article"));

        expect(
            grupoAlameda.getByRole("link", { name: "Cine Alameda" }),
        ).toBeVisible();
        expect(grupoAlameda.getByText("15:30")).toBeVisible();
        expect(grupoAlameda.getByText("18:00")).toBeVisible();
        expect(funciones.queryByText("21:00")).not.toBeInTheDocument();

        await user.click(funciones.getByRole("tab", { selected: false }));

        expect(
            funciones.getByRole("link", { name: "Cine Plaza" }),
        ).toBeVisible();
        expect(funciones.getByText("21:00")).toBeVisible();
        expect(
            funciones.queryByRole("link", { name: "Cine Alameda" }),
        ).not.toBeInTheDocument();
        expect(funciones.queryByText("15:30")).not.toBeInTheDocument();
        expect(router.state.location.search).toBe(`?fecha=${segundoDia}`);
    });

    it("muestra el aviso de funciones vacías cuando no hay horarios", async () => {
        vi.mocked(funcionesService.getHorarios).mockResolvedValueOnce([]);
        renderDetalle();

        expect(
            await screen.findByText(
                "No hay funciones vigentes para esta fecha.",
            ),
        ).toBeVisible();
        expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    });
});
