import { SearchIcon } from "../common/Icons";

interface BuscadorPeliculasProps {
    busqueda: string;
    onBusquedaChange: (nuevaBusqueda: string) => void;
}

function BuscadorPeliculas({
    busqueda,
    onBusquedaChange,
}: BuscadorPeliculasProps) {
    return (
        <div className="buscador">
            <label className="visualmente-oculto" htmlFor="busqueda-pelicula">
                Buscar una película
            </label>
            <span className="icono-busqueda" aria-hidden="true">
                <SearchIcon size={20} />
            </span>
            <input
                id="busqueda-pelicula"
                type="search"
                value={busqueda}
                onChange={(evento) => onBusquedaChange(evento.target.value)}
                placeholder="Buscar películas..."
                autoComplete="off"
            />
        </div>
    );
}

export default BuscadorPeliculas;
