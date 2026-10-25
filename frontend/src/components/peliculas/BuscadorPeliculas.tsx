import { useRef } from "react";
import { CloseIcon, SearchIcon } from "../common/Icons";

interface BuscadorPeliculasProps {
    busqueda: string;
    onBusquedaChange: (nuevaBusqueda: string) => void;
}

function BuscadorPeliculas({
    busqueda,
    onBusquedaChange,
}: BuscadorPeliculasProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="buscador">
            <label htmlFor="busqueda-pelicula">
                Buscar una película
            </label>
            <div className="campo-busqueda-peliculas">
                <span className="icono-busqueda" aria-hidden="true">
                    <SearchIcon size={19} />
                </span>
                <input
                    ref={inputRef}
                    id="busqueda-pelicula"
                    type="search"
                    value={busqueda}
                    onChange={(evento) => onBusquedaChange(evento.target.value)}
                    onKeyDown={(evento) => {
                        if (evento.key === "Escape" && busqueda) onBusquedaChange("");
                    }}
                    placeholder="Buscar películas..."
                    autoComplete="off"
                />
                {busqueda && (
                    <button
                        type="button"
                        className="borrar-busqueda-peliculas"
                        aria-label="Borrar búsqueda de películas"
                        title="Borrar búsqueda"
                        onClick={() => {
                            onBusquedaChange("");
                            inputRef.current?.focus();
                        }}
                    >
                        <CloseIcon size={15} />
                    </button>
                )}
            </div>
        </div>
    );
}

export default BuscadorPeliculas;
