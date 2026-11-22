import {
    createContext,
    useContext,
    useEffect,
    type ReactNode,
} from "react";
import type {
    Usuario,
    LoginInput,
    RegisterInput,
} from "../types/auth";
import { useAuthStore } from "../stores/authStore";

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

const AuthContext = createContext<AuthContextType | undefined>(
    undefined,
);

export const AuthProvider = ({
    children,
}: {
    children: ReactNode;
}) => {
    const user = useAuthStore((state) => state.user);
    const isLoadingSession = useAuthStore(
        (state) => state.isLoadingSession,
    );

    const login = useAuthStore((state) => state.login);
    const register = useAuthStore((state) => state.register);
    const logout = useAuthStore((state) => state.logout);
    const invalidateSession = useAuthStore(
        (state) => state.invalidateSession,
    );

    const isAuthModalOpen = useAuthStore(
        (state) => state.isAuthModalOpen,
    );
    const authModalRedirectTo = useAuthStore(
        (state) => state.authModalRedirectTo,
    );

    const openAuthModal = useAuthStore(
        (state) => state.openAuthModal,
    );
    const closeAuthModal = useAuthStore(
        (state) => state.closeAuthModal,
    );

    const startSessionRestore = useAuthStore(
        (state) => state.startSessionRestore,
    );

    useEffect(() => {
        return startSessionRestore();
    }, [startSessionRestore]);

    const value: AuthContextType = {
        user,
        isAuthenticated: Boolean(user),
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
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

/**
 * Obtiene la sesión y las acciones de autenticación.
 *
 * @throws Error si se utiliza fuera de AuthProvider.
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error(
            "useAuth debe ser utilizado dentro de un AuthProvider",
        );
    }

    return context;
};