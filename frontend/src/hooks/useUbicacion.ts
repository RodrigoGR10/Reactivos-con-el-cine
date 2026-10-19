import { useCallback, useState } from "react";

export interface Ubicacion {
    latitud: number;
    longitud: number;
}

type EstadoUbicacion = "inactivo" | "cargando" | "listo" | "denegado" | "error";

export function useUbicacion() {
    const [ubicacion, setUbicacion] = useState<Ubicacion | null>(null);
    const [estado, setEstado] = useState<EstadoUbicacion>("inactivo");

    //El navegador pide permiso solo cuando el usuario apreta un boton
    const solicitar = useCallback(() => {
        if (!navigator.geolocation) {
            setEstado("error");
            return;
        }

        setEstado("cargando");
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setUbicacion({
                    latitud: pos.coords.latitude,
                    longitud: pos.coords.longitude,
                });
                setEstado("listo");
            },
            (err) =>
                setEstado(
                    err.code === err.PERMISSION_DENIED ? "denegado" : "error",
                ),
            // le damos un maximumAge para decirle que la ubicacion mas vieja que puede ocupar
            // es de 5 minutos (esto es para ahorrar recursos y no pedir la ubi todo el tiempo)
            { timeout: 10000, maximumAge: 5 * 60 * 1000 },
        );
    }, []);

    return { ubicacion, estado, solicitar };
}
