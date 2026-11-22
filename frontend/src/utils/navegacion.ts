/**
 * Destino al que se vuelve después de completar una navegación.
 */
export interface RutaRetorno {
    to: string;
    label: string;
}

interface LocationLike {
    pathname?: unknown;
    search?: unknown;
    hash?: unknown;
}

/**
 * Rechaza destinos externos antes de usarlos en una redirección interna.
 * @param destino Ruta candidata que se desea validar.
 * @returns La ruta segura o `null` si es externa o inválida.
 */
export function rutaInternaSegura(destino?: string | null): string | null {
    if (
        typeof destino !== "string" ||
        !destino.startsWith("/") ||
        destino.startsWith("//")
    ) {
        return null;
    }
    return destino;
}

/**
 * Reconstruye la ruta interna que la persona intentaba abrir antes del login.
 * @param state Estado de navegación recibido desde React Router.
 * @returns Ruta de retorno válida o `null` si el estado no es confiable.
 */
export function obtenerDestinoLogin(state: unknown): string | null {
    if (!state || typeof state !== "object") return null;
    const from = (state as { from?: LocationLike }).from;
    if (!from || typeof from !== "object") return null;

    const pathname = rutaInternaSegura(
        typeof from.pathname === "string" ? from.pathname : null,
    );
    if (!pathname || pathname === "/login") return null;

    const search = typeof from.search === "string" ? from.search : "";
    const hash = typeof from.hash === "string" ? from.hash : "";
    return `${pathname}${search}${hash}`;
}

/**
 * Decide el destino seguro al cerrar la vista `/login` sin autenticar.
 * @param state Estado recibido desde la ruta anterior.
 * @returns Ruta interna válida, con `/` como destino predeterminado.
 */
export function obtenerRutaCierreLogin(state: unknown): string {
    if (state && typeof state === "object") {
        const rawReturnTo = (state as { returnTo?: unknown }).returnTo;
        const returnTo = rutaInternaSegura(
            typeof rawReturnTo === "string" ? rawReturnTo : null,
        );
        if (returnTo && returnTo !== "/login" && returnTo !== "/perfil") {
            return returnTo;
        }
    }

    const from = obtenerDestinoLogin(state);
    if (from && from !== "/perfil") return from;
    return "/";
}

/**
 * Lee el destino de retorno de una navegación o utiliza el destino alternativo.
 * @param state Estado recibido desde React Router.
 * @param fallback Ruta y etiqueta usadas cuando no hay retorno válido.
 * @returns Ruta interna y etiqueta para el enlace de regreso.
 */
export function obtenerVolverA(
    state: unknown,
    fallback: RutaRetorno,
): RutaRetorno {
    if (!state || typeof state !== "object") return fallback;
    const volverA = (state as { volverA?: Partial<RutaRetorno> }).volverA;
    if (!volverA || typeof volverA !== "object") return fallback;

    const to = rutaInternaSegura(volverA.to);
    const label = typeof volverA.label === "string" ? volverA.label.trim() : "";
    if (!to || !label) return fallback;

    return { to, label };
}
