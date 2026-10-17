import axios, { type AxiosResponse } from "axios";
import type { Usuario, LoginInput, RegisterInput } from "../types/auth";
import { API_BASE_URL } from "./apiConfig";

const STORAGE_KEY_CSRF = "csrfToken";
const baseUrl = `${API_BASE_URL}/auth`;

const getAuthConfig = (signal?: AbortSignal) => {
  const csrfToken = localStorage.getItem(STORAGE_KEY_CSRF);
  return {
    withCredentials: true,
    signal,
    headers: csrfToken ? { "X-CSRF-Token": csrfToken } : {},
  };
};

const extractErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    const serverError = (error.response?.data as { error?: string } | undefined)
      ?.error;
    if (typeof serverError === "string" && serverError.trim()) {
      return serverError;
    }
  }
  return fallback;
};

const clearSessionData = (): void => {
  localStorage.removeItem(STORAGE_KEY_CSRF);
};

const saveSessionData = (response: AxiosResponse<Usuario>): Usuario => {
  const csrfToken = response.headers["x-csrf-token"];
  if (typeof csrfToken !== "string" || !csrfToken) {
    throw new Error("El servidor no entregó el token CSRF de la sesión.");
  }

  const usuario = response.data;
  const datosUsuario: Usuario = {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    fechaRegistro: usuario.fechaRegistro,
    peliculasFavoritas: usuario.peliculasFavoritas ?? [],
    cinesFavoritos: usuario.cinesFavoritos ?? [],
  };
  localStorage.setItem(STORAGE_KEY_CSRF, csrfToken);
  return datosUsuario;
};

/** El navegador recibe el JWT en una cookie; en localStorage solo guardamos el token CSRF. */
const login = async (credenciales: LoginInput): Promise<Usuario> => {
  try {
    const response = await axios.post<Usuario>(
      `${baseUrl}/login`,
      {
        email: credenciales.email,
        contrasena: credenciales.contrasena,
      },
      getAuthConfig(),
    );

    return saveSessionData(response);
  } catch (error) {
    throw new Error(
      extractErrorMessage(error, "El correo o la contraseña son incorrectos."),
    );
  }
};

/** Mantiene el inicio de sesión automático del formulario de registro existente. */
const register = async (datos: RegisterInput): Promise<Usuario> => {
  try {
    const response = await axios.post<Usuario>(
      `${baseUrl}/register`,
      {
        nombre: datos.nombre,
        email: datos.email,
        contrasena: datos.contrasena,
      },
      getAuthConfig(),
    );

    return saveSessionData(response);
  } catch (error) {
    throw new Error(
      extractErrorMessage(error, "Error al registrar el usuario."),
    );
  }
};

/** Limpia los datos locales solo cuando el backend confirma el cierre de sesión. */
const logout = async (): Promise<void> => {
  try {
    await axios.post(`${baseUrl}/logout`, {}, getAuthConfig());
    clearSessionData();
  } catch (error) {
    throw new Error(
      extractErrorMessage(error, "No se pudo cerrar la sesión."),
    );
  }
};

/** La sesión se verifica con el servidor, en lugar de confiar en localStorage. */
const getCurrentUser = async (
  signal?: AbortSignal,
): Promise<Usuario | null> => {
  try {
    const response = await axios.get<Usuario>(
      `${baseUrl}/me`,
      getAuthConfig(signal),
    );
    if (signal?.aborted) return null;
    return saveSessionData(response);
  } catch (error) {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      !signal?.aborted
    ) {
      clearSessionData();
    }
    return null;
  }
};

export default {
  login,
  register,
  logout,
  getCurrentUser,
};
