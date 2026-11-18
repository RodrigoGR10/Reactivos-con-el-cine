import { create } from "zustand";
import type { LoginInput, RegisterInput, Usuario } from "../types/auth";
import authService from "../services/authService";

interface AuthState {
  user: Usuario | null;
  isLoadingSession: boolean;
  isAuthModalOpen: boolean;
  initializeSession: () => Promise<void>;
  login: (credentials: LoginInput) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  invalidateSession: () => void;
  openAuthModal: () => void;
  closeAuthModal: () => void;
}

let sessionController: AbortController | null = null;
let authOperation = 0;

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

  initializeSession: async () => {
    sessionController?.abort();
    const controller = new AbortController();
    const operation = ++authOperation;
    sessionController = controller;
    set({ isLoadingSession: true });

    try {
      const user = await authService.getCurrentUser(controller.signal);
      if (!controller.signal.aborted && operation === authOperation) {
        set({ user });
      }
    } finally {
      if (!controller.signal.aborted && operation === authOperation) {
        set({ isLoadingSession: false });
      }
      if (sessionController === controller) sessionController = null;
    }
  },

  login: async (credentials) => {
    const operation = beginAuthOperation();
    set({ isLoadingSession: true });
    try {
      const user = await authService.login(credentials);
      if (operation === authOperation) set({ user });
    } finally {
      if (operation === authOperation) set({ isLoadingSession: false });
    }
  },

  register: async (data) => {
    const operation = beginAuthOperation();
    set({ isLoadingSession: true });
    try {
      const user = await authService.register(data);
      if (operation === authOperation) set({ user });
    } finally {
      if (operation === authOperation) set({ isLoadingSession: false });
    }
  },

  logout: async () => {
    const operation = beginAuthOperation();
    set({ isLoadingSession: true });
    try {
      await authService.logout();
      if (operation === authOperation) {
        set({ user: null, isAuthModalOpen: false });
      }
    } finally {
      if (operation === authOperation) set({ isLoadingSession: false });
    }
  },

  invalidateSession: () => {
    beginAuthOperation();
    authService.clearSessionData();
    set({
      user: null,
      isLoadingSession: false,
      isAuthModalOpen: false,
    });
  },

  openAuthModal: () => set({ isAuthModalOpen: true }),
  closeAuthModal: () => set({ isAuthModalOpen: false }),
}));
