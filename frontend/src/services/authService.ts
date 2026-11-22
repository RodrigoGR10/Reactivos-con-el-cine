import axios, { type AxiosResponse } from "axios";
import type {
    Usuario,
    LoginInput,
    RegisterInput,
} from "../types/auth";
import { API_BASE_URL } from "./apiConfig";

const STORAGE_KEY_CSRF = "csrfToken";
const baseUrl = `${API_BASE_URL}/auth`;

/** Prepara cookie de sesión, token CSRF y cancelación para una petición autenticada. */
const getAuthConfig = (signal?: AbortSignal) => {
    const csrfToken = localStorage.getItem(STORAGE_KEY_CSRF);

    return {
        withCredentials: true,
        signal,
        headers: csrfToken
            ? { "X-CSRF-Token": csrfToken }
            : {},
    };
};

/** Extrae el mensaje JSON del backend o usa el texto alternativo indicado. */
const extractErrorMessage = (
    error: unknown,
    fallback: string,
): string => {
    if (axios.isAxiosError(error)) {
        const serverError = (
            error.response?.data as
                | { error?: string }
                | undefined
        )?.error;

        if (
            typeof serverError === "string" &&
            serverError.trim()
        ) {
            return serverError;
        }
    }

    return fallback;
};

/** Elimina el token CSRF local al terminar o invalidar la sesión. */
const clearSessionData = (): void => {
    localStorage.removeItem(STORAGE_KEY_CSRF);
};

/** Guarda el token CSRF de la respuesta y devuelve el perfil normalizado. */
const saveSessionData = (
    response: AxiosResponse<Usuario>,
): Usuario => {
    const csrfToken = response.headers["x-csrf-token"];

    if (typeof csrfToken !== "string" || !csrfToken) {
        throw new Error(
            "El servidor no entregó el token CSRF de la sesión.",
        );
    }

    const usuario = response.data;

    const datosUsuario: Usuario = {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        fechaRegistro: usuario.fechaRegistro,
        peliculasFavoritas:
            usuario.peliculasFavoritas ?? [],
        cinesFavoritos: usuario.cinesFavoritos ?? [],
    };

    localStorage.setItem(STORAGE_KEY_CSRF, csrfToken);

    return datosUsuario;
};

/**
 * Inicia sesión y conserva el perfil devuelto por el backend.
 * @param credenciales Correo y contraseña ingresados en el formulario.
 * @returns Usuario autenticado.
 * @throws Error con el mensaje recibido o uno alternativo si falla el acceso.
 */
const login = async (
    credenciales: LoginInput,
): Promise<Usuario> => {
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
            extractErrorMessage(
                error,
                "El correo o la contraseña son incorrectos.",
            ),
            { cause: error },
        );
    }
};

/**
 * Registra una cuenta y devuelve el perfil con sesión iniciada.
 * @param datos Nombre, correo y contraseñas del formulario de registro.
 * @returns Usuario creado y autenticado.
 * @throws Error con el mensaje recibido o uno alternativo si falla el registro.
 */
const register = async (
    datos: RegisterInput,
): Promise<Usuario> => {
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
            extractErrorMessage(
                error,
                "Error al registrar el usuario.",
            ),
            { cause: error },
        );
    }
};

/**
 * Solicita el cierre de sesión y limpia el token CSRF
 * si el servidor confirma.
 * @throws Error si el servidor no pudo cerrar la sesión.
 */
const logout = async (): Promise<void> => {
    try {
        await axios.post(
            `${baseUrl}/logout`,
            {},
            getAuthConfig(),
        );

        clearSessionData();
    } catch (error) {
        throw new Error(
            extractErrorMessage(
                error,
                "No se pudo cerrar la sesión.",
            ),
            { cause: error },
        );
    }
};

/**
 * Restaura la sesión consultando al servidor.
 * No confía en datos de usuario locales.
 * @param signal Señal opcional para cancelar la restauración.
 * @returns Usuario activo o null si no hay sesión válida.
 */
const getCurrentUser = async (
    signal?: AbortSignal,
): Promise<Usuario | null> => {
    try {
        const response = await axios.get<Usuario>(
            `${baseUrl}/me`,
            getAuthConfig(signal),
        );

        if (signal?.aborted) {
            return null;
        }

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
    clearSessionData,
};