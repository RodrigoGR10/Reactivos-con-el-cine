// @vitest-environment jsdom
import { HeadlessMantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../context/AuthContext";
import { FavoritesProvider } from "../context/FavoritesContext";
import cinesService from "../services/cines";
import type { Cine } from "../types/types";
import CinemasPage from "./CinemasPage";

vi.mock("../services/cines", () => ({ default: { getAll: vi.fn() } }));
vi.mock("../services/authService", () => ({
    default: { getCurrentUser: async () => null },
}));

const consultarCines = vi.mocked(cinesService.getAll);
const cines: Cine[] = [
    {
        id: "1",
        nombre: "Cine Alameda",
        comuna: "Santiago",
        origen: "cinemark",
        latitud: -33.45,
        longitud: -70.65,
    },
    {
        id: "2",
        nombre: "Cine Plaza",
        comuna: "Providencia",
        origen: "cineplanet",
    },
];

function renderCines() {
    const user = userEvent.setup();
    render(
        <HeadlessMantineProvider env="test">
            <MemoryRouter>
                <AuthProvider>
                    <FavoritesProvider>
                        <CinemasPage />
                    </FavoritesProvider>
                </AuthProvider>
            </MemoryRouter>
        </HeadlessMantineProvider>,
    );
    return user;
}

describe("Directorio de cines", () => {
    beforeEach(() => {
        consultarCines.mockReset().mockResolvedValue(cines);
    });

    it("muestra la carga y luego presenta los cines devueltos por el servicio", async () => {
        renderCines();

        expect(screen.getByRole("status", { busy: true })).toHaveTextContent(
            "Cargando complejos cinematográficos...",
        );
        expect(
            await screen.findByRole("link", { name: "Cine Alameda" }),
        ).toBeVisible();
        expect(screen.getByRole("link", { name: "Cine Plaza" })).toBeVisible();
        expect(screen.getByRole("status")).toHaveTextContent("2 cines");
        expect(
            screen.queryByRole("status", { busy: true }),
        ).not.toBeInTheDocument();
    });

    it("combina comuna y búsqueda y permite restablecer ambas desde el estado vacío", async () => {
        const user = renderCines();
        await screen.findByRole("link", { name: "Cine Alameda" });

        await user.click(
            screen.getByRole("button", { name: /filtrar por comunas/i }),
        );
        await user.click(
            await screen.findByRole("checkbox", { name: "Santiago" }),
        );
        await user.click(screen.getByRole("button", { name: "Listo" }));

        expect(
            screen.getByRole("link", { name: "Cine Alameda" }),
        ).toBeVisible();
        expect(
            screen.queryByRole("link", { name: "Cine Plaza" }),
        ).not.toBeInTheDocument();
        expect(screen.getByRole("status")).toHaveTextContent("1 cine");

        const buscador = screen.getByRole("searchbox", {
            name: "Buscar cines",
        });
        await user.type(buscador, "Plaza");
        expect(
            screen.getByRole("heading", { name: "No se encontraron cines" }),
        ).toBeVisible();
        expect(screen.getByRole("status")).toHaveTextContent("0 cines");

        await user.click(
            screen.getByRole("button", { name: "Restablecer búsqueda" }),
        );
        expect(buscador).toHaveValue("");
        expect(
            screen.queryByRole("button", { name: "Quitar filtro Santiago" }),
        ).not.toBeInTheDocument();
        expect(
            screen.getByRole("link", { name: "Cine Alameda" }),
        ).toBeVisible();
        expect(screen.getByRole("link", { name: "Cine Plaza" })).toBeVisible();
    });

    it("muestra el error de carga cuando falla la consulta", async () => {
        consultarCines.mockRejectedValueOnce(
            new Error("Servicio no disponible"),
        );
        renderCines();

        expect(
            await screen.findByText("Error al cargar los cines"),
        ).toBeVisible();
        expect(
            screen.getByText(
                "No se pudieron cargar los cines. Intenta nuevamente.",
            ),
        ).toBeVisible();
        expect(
            screen.queryByRole("status", { busy: true }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole("heading", { name: "No se encontraron cines" }),
        ).not.toBeInTheDocument();
    });
});

afterEach(() => Reflect.deleteProperty(navigator, "geolocation"));

it.each([
    [1, /habilita el permiso/i],
    [2, /no está disponible en este momento/i],
    [3, /tardó demasiado/i],
] as const)(
    "explica el error de geolocalización %i y conserva los cines",
    async (code, aviso) => {
        const getCurrentPosition = vi.fn(
            (_exito: PositionCallback, error: PositionErrorCallback) =>
                error({ code } as GeolocationPositionError),
        );
        Object.defineProperty(navigator, "geolocation", {
            configurable: true,
            value: { getCurrentPosition },
        });
        const user = renderCines();
        const cercania = await screen.findByRole("button", {
            name: "Cerca de mí",
        });
        expect(getCurrentPosition).not.toHaveBeenCalled();
        await user.click(cercania);

        expect(screen.getByText(aviso)).toBeVisible();
        expect(
            await screen.findByRole("link", { name: "Cine Alameda" }),
        ).toBeVisible();
        await user.click(
            screen.getByRole("button", { name: "Cerrar aviso de ubicación" }),
        );
        expect(screen.queryByText(aviso)).not.toBeInTheDocument();
        expect(cercania).toBeEnabled();

        getCurrentPosition.mockImplementationOnce((exito) =>
            exito({
                coords: { latitude: -33.45, longitude: -70.65 },
            } as GeolocationPosition),
        );
        await user.click(cercania);

        expect(cercania).toHaveAttribute("aria-pressed", "true");
        expect(screen.getByText("0 m")).toBeVisible();
    },
);
