import { useEffect, useState } from "react";

/**
 * Cuenta segundos mientras una operación está activa y reinicia al detenerse.
 * @param activo Indica si el contador debe avanzar.
 * @returns Segundos transcurridos, o cero cuando está inactivo.
 */
export function useSegundosTranscurridos(activo: boolean): number {
    const [segundos, setSegundos] = useState(0);

    useEffect(() => {
        if (!activo) return;
        const inicio = Date.now();
        const intervalo = setInterval(
            () => setSegundos(Math.floor((Date.now() - inicio) / 1000)),
            1000,
        );
        return () => {
            clearInterval(intervalo);
            setSegundos(0);
        };
    }, [activo]);

    return activo ? segundos : 0;
}
