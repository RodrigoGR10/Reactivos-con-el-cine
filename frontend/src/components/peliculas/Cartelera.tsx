import type { Pelicula } from "../../types/types.ts";
import { useMediaQuery } from "../../hooks/useMediaQuery.ts";
import TarjetaPelicula from "./TarjetaPelicula.tsx";

interface CarteleraProps {
    peliculas: Pelicula[];
}

/**
 * Presenta las tarjetas de película en grilla o en formato horizontal móvil.
 * @param peliculas Películas que deben aparecer en la cartelera.
 */
function Cartelera({ peliculas }: CarteleraProps) {
    const esMovil = useMediaQuery("(max-width: 560px)");

    if (peliculas.length === 0) {
        return (
            <p className="sin-resultados" role="status">
                No encontramos películas que coincidan con tu búsqueda y
                filtros.
            </p>
        );
    }

    if (esMovil) {
        return (
            <div className="cinta-peliculas">
                {peliculas.map((pelicula) => (
                    <TarjetaPelicula key={pelicula.id} pelicula={pelicula} />
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
