import { useEffect, useState } from "react";

/** Cuenta los segundos enteros desde que `activo` pasa a true; vuelve a 0 al desactivarse. */
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
