import { useEffect, type DependencyList } from "react";

/**
 * Agrega indicadores visuales de scroll horizontal (clases `.more-start` y `.more-end`)
 * a contenedores desplazables mediante IntersectionObserver.
 *
 * Se desactiva automáticamente si el navegador ya soporta nativamente
 * la propiedad CSS `animation-timeline: scroll()`.
 *
 * @param selector Selector CSS de los contenedores (ej. ".detalle-pelicula .horarios-grid-cine")
 * @param dependencias Lista de dependencias que desencadenan la re-observación cuando el DOM cambia
 */

export function useScrollIndicadores(
    selector: string,
    dependencias: DependencyList = [],
): void {
    useEffect(() => {
        if (
            typeof window === "undefined" ||
            typeof CSS === "undefined" ||
            CSS.supports("animation-timeline", "scroll()") ||
            typeof IntersectionObserver === "undefined"
        ) {
            return;
        }

        const observers: IntersectionObserver[] = [];
        const scrollers = document.querySelectorAll<HTMLElement>(selector);
        for (const scroller of scrollers) {
            const first = scroller.firstElementChild;
            const last = scroller.lastElementChild;
            if (!first || !last) continue;

            const observer = new IntersectionObserver(
                (entries) => {
                    for (const { target, intersectionRatio } of entries) {
                        scroller.classList.toggle(
                            target === first ? "more-start" : "more-end",
                            intersectionRatio < 1,
                        );
                    }
                },
                { root: scroller, threshold: 1, rootMargin: "1px" },
            );

            observer.observe(first);
            observer.observe(last);
            observers.push(observer);
        }

        return () => {
            for (const observer of observers) observer.disconnect();
        };
        //ignora esto, es para evitar un warning del IDE
        //eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selector, ...dependencias]);
}
