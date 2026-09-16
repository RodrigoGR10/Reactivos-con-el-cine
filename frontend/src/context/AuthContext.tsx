import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Usuario, LoginInput, RegisterInput } from '../types/auth';
import authService from '../services/authService';

interface AuthContextType {
    user: Usuario | null;
    isAuthenticated: boolean;
    login: (credenciales: LoginInput) => Promise<void>;
    register: (datos: RegisterInput) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    // Inicialización perezosa: lee el usuario guardado solo al cargar la app
    const [user, setUser] = useState<Usuario | null>(() => authService.getCurrentUser());

    const login = async (credenciales: LoginInput): Promise<void> => {
        const usuarioAutenticado = await authService.login(credenciales);
        setUser(usuarioAutenticado);
    };

    const register = async (datos: RegisterInput): Promise<void> => {
        const nuevoUsuario = await authService.register(datos);
        setUser(nuevoUsuario);
    };

    const logout = (): void => {
        authService.logout();
        setUser(null);
    };

    const value: AuthContextType = {
        user,
        isAuthenticated: !!user,
        login,
        register,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// Hook personalizado para acceder al estado de autenticación
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
    }
    return context;
};
