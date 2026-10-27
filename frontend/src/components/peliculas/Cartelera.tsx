import type { Pelicula } from "../../types/types.ts";
import { useMemo } from "react";
import { useMediaQuery } from "../../hooks/useMediaQuery.ts";
import TarjetaPelicula from "./TarjetaPelicula.tsx";

interface CarteleraProps {
    peliculas: Pelicula[];
    hayFiltrosActivos?: boolean;
    compararPrioridad: (a: Pelicula, b: Pelicula) => number;
}

//Una pelicula con varios generos aparece en cada cinta
function agruparPorGenero(peliculas: Pelicula[], compararPrioridad: CarteleraProps["compararPrioridad"]): [string, Pelicula[]][] {
    const grupos = new Map<string, Pelicula[]>();

    for (const pelicula of peliculas) {
        const generos = pelicula.genero
            .split(",")
            .map((genero) => genero.trim())
            .filter(Boolean);
        for (const genero of generos) {
            grupos.set(genero, [...(grupos.get(genero) ?? []), pelicula]);
        }
    }

    return [...grupos.entries()].sort(
        (a, b) => compararPrioridad(a[1][0], b[1][0])
            || b[1].length - a[1].length
            || a[0].localeCompare(b[0], "es"),
    );
}

function Cartelera({ peliculas, hayFiltrosActivos = false, compararPrioridad }: CarteleraProps) {
    const esMovil = useMediaQuery("(max-width: 560px)");
    const grupos = useMemo(() => agruparPorGenero(peliculas, compararPrioridad), [peliculas, compararPrioridad]);

    if (peliculas.length === 0) {
        return (
            <p className="sin-resultados" role="status">
                No encontramos películas que coincidan con tu búsqueda y
                filtros.
            </p>
        );
    }

    // Celu sin filtros: una cinta horizontal por genero

    if (esMovil && !hayFiltrosActivos) {
        return (
            <div className="cintas-peliculas">
                {grupos.map(([genero, lista]) => (
                    <section key={genero}>
                        <h3 className="titulo-cinta">{genero}</h3>
                        <div className="cinta-peliculas">
                            {lista.map((pelicula) => (
                                <TarjetaPelicula
                                    key={pelicula.id}
                                    pelicula={pelicula}
                                />
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        );
    }

    return (
        <div className="grilla-peliculas">
            {peliculas.map((pelicula) => (
                <TarjetaPelicula key={pelicula.id} pelicula={pelicula} />
            ))}
        </div>
    );
}

export default Cartelera;
