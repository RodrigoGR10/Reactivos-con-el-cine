import type { Usuario, LoginInput, RegisterInput } from "../types/auth";

const STORAGE_KEY_USUARIO_ACTIVO = "cine_usuario_activo";
const BASE_URL = "http://localhost:3001/auth";

/** Autentica usuario contra el backend MongoDB y guarda sesión en localStorage */
const login = async (credenciales: LoginInput): Promise<Usuario> => {
  const response = await fetch(`${BASE_URL}/login`, {
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

  localStorage.setItem(STORAGE_KEY_USUARIO_ACTIVO, JSON.stringify(data));
  return data as Usuario;
};

/** Registra nuevo usuario en MongoDB y guarda sesión automáticamente en localStorage */
const register = async (datos: RegisterInput): Promise<Usuario> => {
  const response = await fetch(`${BASE_URL}/register`, {
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

  localStorage.setItem(STORAGE_KEY_USUARIO_ACTIVO, JSON.stringify(data));
  return data as Usuario;
};

/** Cierra sesión eliminando usuario activo de localStorage */
const logout = (): void => {
  localStorage.removeItem(STORAGE_KEY_USUARIO_ACTIVO);
};

/** Recupera usuario activo si hay sesión válida; limpia storage si hay dato corrupto */
const getCurrentUser = (): Usuario | null => {
  const data = localStorage.getItem(STORAGE_KEY_USUARIO_ACTIVO);
  if (!data) return null;
  try {
    return JSON.parse(data) as Usuario;
  } catch {
    logout();
    return null;
  }
};

export default {
  login,
  register,
  logout,
  getCurrentUser,
};
