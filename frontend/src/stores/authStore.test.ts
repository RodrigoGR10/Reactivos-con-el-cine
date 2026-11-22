
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

import authService from "../services/authService";
import type { Usuario } from "../types/auth";
import { useAuthStore } from "./authStore";

vi.mock("../services/authService", () => ({
    default: {
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        getCurrentUser: vi.fn(),
        clearSessionData: vi.fn(),
    },
}));

const usuario: Usuario = {
    id: "1",
    nombre: "Ana",
    email: "ana@example.com",
};

beforeEach(() => {
    useAuthStore.getState().invalidateSession();

    vi.resetAllMocks();

    useAuthStore.setState({
        user: null,
        isLoadingSession: true,
        isAuthModalOpen: false,
        authModalRedirectTo: null,
    });
});

describe("authStore", () => {
    it("guarda el usuario después de iniciar sesión", async () => {
        vi.mocked(authService.login).mockResolvedValue(usuario);

        await useAuthStore.getState().login({
            email: usuario.email,
            contrasena: "password123",
        });

        expect(useAuthStore.getState().user).toEqual(usuario);
        expect(useAuthStore.getState().isLoadingSession).toBe(false);
    });

    it("conserva el destino al abrir el modal de autenticación", () => {
        useAuthStore.getState().openAuthModal("/perfil");

        expect(
            useAuthStore.getState().isAuthModalOpen,
        ).toBe(true);

        expect(
            useAuthStore.getState().authModalRedirectTo,
        ).toBe("/perfil");
    });

    it("elimina el destino al cerrar el modal", () => {
        useAuthStore.getState().openAuthModal("/perfil");
        useAuthStore.getState().closeAuthModal();

        expect(
            useAuthStore.getState().isAuthModalOpen,
        ).toBe(false);

        expect(
            useAuthStore.getState().authModalRedirectTo,
        ).toBeNull();
    });

    it("invalida la sesión y limpia los datos locales", () => {
        useAuthStore.setState({
            user: usuario,
            isLoadingSession: false,
        });

        useAuthStore.getState().openAuthModal("/perfil");
        useAuthStore.getState().invalidateSession();

        expect(useAuthStore.getState().user).toBeNull();
        expect(
            useAuthStore.getState().isLoadingSession,
        ).toBe(false);

        expect(
            useAuthStore.getState().isAuthModalOpen,
        ).toBe(false);

        expect(authService.clearSessionData).toHaveBeenCalled();
    });
});
