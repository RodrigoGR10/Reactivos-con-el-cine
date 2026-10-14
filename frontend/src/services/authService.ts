import type { Usuario, LoginInput, RegisterInput } from "../types/auth";
import { API_BASE_URL } from "./apiConfig";

const STORAGE_KEY_USUARIO_ACTIVO = "cine_usuario_activo";
const STORAGE_KEY_CSRF = "csrfToken";
const BASE_URL = `${API_BASE_URL}/auth`;

const fetchAuth = (endpoint: string, options: RequestInit = {}) => {
  const headers = new Headers(options.headers);
  const csrfToken = localStorage.getItem(STORAGE_KEY_CSRF);
  if (csrfToken) {
    headers.set("X-CSRF-Token", csrfToken);
  }

  return fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: "include",
  });
};

const clearSessionData = (): void => {
  localStorage.removeItem(STORAGE_KEY_USUARIO_ACTIVO);
  localStorage.removeItem(STORAGE_KEY_CSRF);
};

const saveSessionData = (response: Response, usuario: Usuario): Usuario => {
  const csrfToken = response.headers.get("X-CSRF-Token");
  if (!csrfToken) {
    throw new Error("El servidor no entregó el token CSRF de la sesión.");
  }

  const datosUsuario: Usuario = {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    fechaRegistro: usuario.fechaRegistro,
  };
  localStorage.setItem(STORAGE_KEY_CSRF, csrfToken);
  localStorage.setItem(STORAGE_KEY_USUARIO_ACTIVO, JSON.stringify(datosUsuario));
  return datosUsuario;
};

/** El navegador recibe el JWT en una cookie; solo guardamos datos de usuario y CSRF. */
const login = async (credenciales: LoginInput): Promise<Usuario> => {
  const response = await fetchAuth("/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: credenciales.email,
      contrasena: credenciales.contrasena,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "El correo o la contraseña son incorrectos.");
  }

  return saveSessionData(response, data as Usuario);
};

/** Mantiene el inicio de sesión automático del formulario de registro existente. */
const register = async (datos: RegisterInput): Promise<Usuario> => {
  const response = await fetchAuth("/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      nombre: datos.nombre,
      email: datos.email,
      contrasena: datos.contrasena,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Error al registrar el usuario.");
  }

  return saveSessionData(response, data as Usuario);
};

/** Solicita eliminar la cookie; también limpia los datos si la sesión ya expiró. */
const logout = async (): Promise<void> => {
  const response = await fetchAuth("/logout", { method: "POST" });
  if (!response.ok && response.status !== 401) {
    const data = await response.json();
    throw new Error(data.error || "No se pudo cerrar la sesión.");
  }
  clearSessionData();
};

/** La sesión se verifica con el servidor, en lugar de confiar en localStorage. */
const getCurrentUser = async (signal?: AbortSignal): Promise<Usuario | null> => {
  try {
    const response = await fetchAuth("/me", { signal });
    if (response.status === 401) {
      if (!signal?.aborted) clearSessionData();
      return null;
    }
    if (!response.ok) return null;

    const data = await response.json();
    if (signal?.aborted) return null;
    return saveSessionData(response, data as Usuario);
  } catch {
    return null;
  }
};

export default {
  login,
  register,
  logout,
  getCurrentUser,
};
