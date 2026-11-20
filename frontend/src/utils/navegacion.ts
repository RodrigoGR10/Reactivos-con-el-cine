export interface RutaRetorno {
  to: string;
  label: string;
}

interface LocationLike {
  pathname?: unknown;
  search?: unknown;
  hash?: unknown;
}

/** Valida que una ruta interna comience con "/" y no sea un esquema relativo "//". */
export function rutaInternaSegura(destino?: string | null): string | null {
  if (typeof destino !== "string" || !destino.startsWith("/") || destino.startsWith("//")) {
    return null;
  }
  return destino;
}

/** Obtiene de forma segura la URL previa guardada en `location.state.from` para volver tras el login. */
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

/** Resuelve a qué ruta volver al cerrar `/login` sin haber iniciado sesión. */
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

/** Lee `location.state.volverA` si es una ruta interna válida, o usa el fallback indicado. */
export function obtenerVolverA(state: unknown, fallback: RutaRetorno): RutaRetorno {
  if (!state || typeof state !== "object") return fallback;
  const volverA = (state as { volverA?: Partial<RutaRetorno> }).volverA;
  if (!volverA || typeof volverA !== "object") return fallback;

  const to = rutaInternaSegura(volverA.to);
  const label = typeof volverA.label === "string" ? volverA.label.trim() : "";
  if (!to || !label) return fallback;

  return { to, label };
}
