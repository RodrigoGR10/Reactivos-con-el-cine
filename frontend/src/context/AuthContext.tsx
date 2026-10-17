import {
  createContext,
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
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<Usuario | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
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

  const openAuthModal = (): void => setIsAuthModalOpen(true);
  const closeAuthModal = (): void => setIsAuthModalOpen(false);

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
    isAuthModalOpen,
    openAuthModal,
    closeAuthModal,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe ser utilizado dentro de un AuthProvider");
  }
  return context;
};
