// @vitest-environment jsdom
import { HeadlessMantineProvider } from "@mantine/core";
import { act, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "../../context/AuthContext";
import authService from "../../services/authService";
import type { Usuario } from "../../types/auth";
import ProtectedRoute from "./ProtectedRoute";

vi.mock("../../services/authService", () => ({
    default: { getCurrentUser: vi.fn() },
}));

const getCurrentUser = vi.mocked(authService.getCurrentUser);

function PerfilDePrueba() {
    const { user } = useAuth();
    return <h1>Perfil de {user?.nombre}</h1>;
}

function renderRutaProtegida() {
    const router = createMemoryRouter(
        [
            {
                element: <ProtectedRoute />,
                children: [{ path: "/perfil", element: <PerfilDePrueba /> }],
            },
            { path: "/login", element: <h1>Iniciar sesión</h1> },
        ],
        {
            initialEntries: [
                {
                    pathname: "/perfil",
                    search: "?tab=cines",
                    state: { returnTo: "/cines" },
                },
            ],
        },
    );
    render(
        <HeadlessMantineProvider>
            <AuthProvider>
                <RouterProvider router={router} />
            </AuthProvider>
        </HeadlessMantineProvider>,
    );
    return router;
}

describe("ProtectedRoute con AuthProvider", () => {
    beforeEach(() => {
        getCurrentUser.mockReset();
    });

    it("espera la restauración de sesión antes de mostrar el perfil", async () => {
        let restaurarSesion!: (usuario: Usuario) => void;
        const sesionPendiente = new Promise<Usuario>((resolve) => {
            restaurarSesion = resolve;
        });
        getCurrentUser.mockReturnValue(sesionPendiente);

        renderRutaProtegida();

        expect(screen.getByRole("status")).toHaveTextContent(
            "Comprobando sesión...",
        );
        expect(
            screen.queryByRole("heading", { name: /perfil/i }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole("heading", { name: "Iniciar sesión" }),
        ).not.toBeInTheDocument();

        await act(() => {
            restaurarSesion({
                id: "1",
                nombre: "Ana",
                email: "ana@example.com",
            });
        });

        expect(
            screen.getByRole("heading", { name: "Perfil de Ana" }),
        ).toBeVisible();
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    it("redirige al login sin sesión y conserva el destino original", async () => {
        getCurrentUser.mockResolvedValue(null);
        const router = renderRutaProtegida();

        expect(
            await screen.findByRole("heading", { name: "Iniciar sesión" }),
        ).toBeVisible();
        expect(
            screen.queryByRole("heading", { name: /perfil/i }),
        ).not.toBeInTheDocument();
        expect(router.state.location).toMatchObject({
            pathname: "/login",
            state: {
                from: { pathname: "/perfil", search: "?tab=cines" },
                returnTo: "/cines",
            },
        });
    });
});
