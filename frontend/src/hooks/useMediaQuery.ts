import { useEffect, useState } from "react";

/**
 * Mantiene en React el resultado actual de una consulta CSS de medios.
 * @param query Expresión CSS, por ejemplo `"(max-width: 600px)"`.
 * @returns `true` mientras la ventana coincide con la consulta.
 */
export function useMediaQuery(query: string): boolean {
    const [coincide, setCoincide] = useState(
        () => window.matchMedia(query).matches,
    );

    useEffect(() => {
        const mql = window.matchMedia(query);
        const actualizar = () => setCoincide(mql.matches);

        actualizar();
        mql.addEventListener("change", actualizar);
        return () => mql.removeEventListener("change", actualizar);
    }, [query]);

    return coincide;
}
