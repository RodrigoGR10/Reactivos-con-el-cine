import { useEffect, useState } from "react";

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
