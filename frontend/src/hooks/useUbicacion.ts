import { useCallback, useState } from "react";

/**
 * Coordenadas y datos de la ubicación actual o seleccionada.
 */
export interface Ubicacion {
    latitud: number;
    longitud: number;
}

/**
 * Estado de solicitud de ubicación, incluyendo errores y disponibilidad.
 */
type ErrorUbicacion =
    | "denegado"
    | "sin-posicion"
    | "tiempo-agotado"
    | "sin-soporte"
    | "conexion-insegura"
    | "error";

export type EstadoUbicacion =
    "inactivo" | "cargando" | "listo" | ErrorUbicacion;

// Códigos definidos por GeolocationPositionError.
const erroresPorCodigo: Partial<Record<number, ErrorUbicacion>> = {
    1: "denegado",
    2: "sin-posicion",
    3: "tiempo-agotado",
};

/**
 * Solicita la ubicación solo cuando la interfaz llama a `solicitar`.
 * @returns Coordenadas, estado de permiso/consulta y acciones relacionadas.
 */
export function useUbicacion() {
    const [ubicacion, setUbicacion] = useState<Ubicacion | null>(null);
    const [estado, setEstado] = useState<EstadoUbicacion>("inactivo");

    //El navegador pide permiso solo cuando el usuario apreta un boton
    const solicitar = useCallback(() => {
        if (window.isSecureContext === false) {
            setEstado("conexion-insegura");
            return;
        }

        const geolocation = navigator.geolocation;
        if (!geolocation) {
            setEstado("sin-soporte");
            return;
        }

        setEstado("cargando");
        try {
            geolocation.getCurrentPosition(
                ({ coords }) => {
                    setUbicacion({
                        latitud: coords.latitude,
                        longitud: coords.longitude,
                    });
                    setEstado("listo");
                },
                ({ code }) => setEstado(erroresPorCodigo[code] ?? "error"),
                { timeout: 20_000, maximumAge: 5 * 60 * 1000 },
            );
        } catch {
            setEstado("error");
        }
    }, []);

    const descartarAviso = useCallback(() => {
        setEstado((prev) =>
            prev === "cargando" || prev === "listo" ? prev : "inactivo",
        );
    }, []);

    return { ubicacion, estado, solicitar, descartarAviso };
}
