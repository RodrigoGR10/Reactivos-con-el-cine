
import { create } from "zustand";
import type {
    LoginInput,
    RegisterInput,
    Usuario,
} from "../types/auth";
import authService from "../services/authService";

interface AuthState {
    user: Usuario | null;
    isLoadingSession: boolean;
    isAuthModalOpen: boolean;
    authModalRedirectTo: string | null;

    startSessionRestore: () => () => void;
    login: (credentials: LoginInput) => Promise<void>;
    register: (data: RegisterInput) => Promise<void>;
    logout: () => Promise<void>;
    invalidateSession: () => void;

    openAuthModal: (redirectTo?: string) => void;
    closeAuthModal: () => void;
}

let sessionController: AbortController | null = null;
let authOperation = 0;

/**
 * Cancela una restauración anterior y crea una nueva versión
 * de operación para evitar que respuestas antiguas cambien la sesión.
 */
function beginAuthOperation(): number {
    sessionController?.abort();
    sessionController = null;
    authOperation += 1;
    return authOperation;
}

export const useAuthStore = create<AuthState>()((set) => ({
    user: null,
    isLoadingSession: true,
    isAuthModalOpen: false,
    authModalRedirectTo: null,

    /**
     * Comprueba en el backend si existe una sesión válida.
     * Devuelve una función para cancelar la petición al desmontar
     * el proveedor de autenticación.
     */
    startSessionRestore: () => {
        const operation = beginAuthOperation();
        const controller = new AbortController();

        sessionController = controller;
        set({ isLoadingSession: true });

        void authService
            .getCurrentUser(controller.signal)
            .then((user) => {
                if (
                    !controller.signal.aborted &&
                    operation === authOperation
                ) {
                    set({ user });
                }
            })
            .catch(() => {
                if (
                    !controller.signal.aborted &&
                    operation === authOperation
                ) {
                    set({ user: null });
                }
            })
            .finally(() => {
                if (
                    !controller.signal.aborted &&
                    operation === authOperation
                ) {
                    set({ isLoadingSession: false });
                }

                if (sessionController === controller) {
                    sessionController = null;
                }
            });

        return () => {
            controller.abort();

            if (sessionController === controller) {
                sessionController = null;
            }
        };
    },

    /**
     * Inicia sesión y guarda el usuario autenticado.
     */
    login: async (credentials) => {
        const operation = beginAuthOperation();

        try {
            const user = await authService.login(credentials);

            if (operation === authOperation) {
                set({ user });
            }
        } finally {
            if (operation === authOperation) {
                set({ isLoadingSession: false });
            }
        }
    },

    /**
     * Registra un usuario y conserva la sesión iniciada.
     */
    register: async (data) => {
        const operation = beginAuthOperation();

        try {
            const user = await authService.register(data);

            if (operation === authOperation) {
                set({ user });
            }
        } finally {
            if (operation === authOperation) {
                set({ isLoadingSession: false });
            }
        }
    },

    /**
     * Cierra la sesión en el backend.
     */
    logout: async () => {
        const operation = beginAuthOperation();

        try {
            await authService.logout();

            if (operation === authOperation) {
                set({ user: null });
            }
        } finally {
            if (operation === authOperation) {
                set({ isLoadingSession: false });
            }
        }
    },

    /**
     * Invalida la sesión local cuando el backend devuelve
     * una respuesta que indica que ya no está autorizada.
     */
    invalidateSession: () => {
        beginAuthOperation();
        authService.clearSessionData();

        set({
            user: null,
            isLoadingSession: false,
            isAuthModalOpen: false,
            authModalRedirectTo: null,
        });
    },

    /**
     * Abre el modal y conserva una ruta de destino opcional.
     */
    openAuthModal: (redirectTo) => {
        set({
            isAuthModalOpen: true,
            authModalRedirectTo: redirectTo ?? null,
        });
    },

    /**
     * Cierra el modal y elimina su destino pendiente.
     */
    closeAuthModal: () => {
        set({
            isAuthModalOpen: false,
            authModalRedirectTo: null,
        });
    },
}));
