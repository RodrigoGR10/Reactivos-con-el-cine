import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from "react";
import type { Usuario, LoginInput, RegisterInput } from "../types/auth";
import authService from "../services/authService";

interface AuthContextType {
    user: Usuario | null;
    isAuthenticated: boolean;
    isLoadingSession: boolean;
    login: (credenciales: LoginInput) => Promise<void>;
    register: (datos: RegisterInput) => Promise<void>;
    logout: () => Promise<void>;
    invalidateSession: () => void;
    isAuthModalOpen: boolean;
    authModalRedirectTo: string | null;
    openAuthModal: (redirectTo?: string) => void;
    closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Comparte la sesión y los controles del modal de autenticación con la app.
 * @param children Componentes que podrán consultar la sesión con `useAuth`.
 * @returns Elemento de interfaz que representa el componente con las propiedades recibidas.
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<Usuario | null>(null);
    const [isLoadingSession, setIsLoadingSession] = useState(true);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authModalRedirectTo, setAuthModalRedirectTo] = useState<
        string | null
    >(null);
    // Evita que una restauración pendiente sobrescriba un login o logout posterior.
    const restoreController = useRef<AbortController | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        restoreController.current = controller;

        authService.getCurrentUser(controller.signal).then((usuario) => {
            if (!controller.signal.aborted) {
                setUser(usuario);
                setIsLoadingSession(false);
            }
        });

        return () => controller.abort();
    }, []);

    const openAuthModal = (redirectTo?: string): void => {
        setAuthModalRedirectTo(redirectTo ?? null);
        setIsAuthModalOpen(true);
    };
    const closeAuthModal = (): void => {
        setIsAuthModalOpen(false);
        setAuthModalRedirectTo(null);
    };

    const invalidateSession = useCallback((): void => {
        restoreController.current?.abort();
        authService.clearSessionData();
        setUser(null);
        setIsLoadingSession(false);
        setIsAuthModalOpen(false);
        setAuthModalRedirectTo(null);
    }, []);

    const login = async (credenciales: LoginInput): Promise<void> => {
        restoreController.current?.abort();
        try {
            const usuarioAutenticado = await authService.login(credenciales);
            setUser(usuarioAutenticado);
        } finally {
            setIsLoadingSession(false);
        }
    };

    const register = async (datos: RegisterInput): Promise<void> => {
        restoreController.current?.abort();
        try {
            const nuevoUsuario = await authService.register(datos);
            setUser(nuevoUsuario);
        } finally {
            setIsLoadingSession(false);
        }
    };

    const logout = async (): Promise<void> => {
        restoreController.current?.abort();
        try {
            await authService.logout();
            setUser(null);
        } finally {
            setIsLoadingSession(false);
        }
    };

    const value: AuthContextType = {
        user,
        isAuthenticated: !!user,
        isLoadingSession,
        login,
        register,
        logout,
        invalidateSession,
        isAuthModalOpen,
        authModalRedirectTo,
        openAuthModal,
        closeAuthModal,
    };

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
};

/**
 * Obtiene la sesión y las acciones de autenticación del contexto más cercano.
 * @returns Usuario, estado de carga, métodos de sesión y control del modal.
 * @throws Error si se usa fuera de `AuthProvider`.
 */
export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth debe ser utilizado dentro de un AuthProvider");
    }
    return context;
};
