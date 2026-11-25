import { useId, useRef } from "react";
import { CloseIcon, SearchIcon } from "../common/Icons";
import "./FiltrosPeliculas.css";

/** Propiedades del campo de búsqueda de películas. */
interface BuscadorPeliculasProps {
    busqueda: string;
    onBusquedaChange: (nuevaBusqueda: string) => void;
    placeholder?: string;
    label?: string;
    id?: string;
    className?: string;
}

/**
 * Campo accesible de búsqueda con limpieza por Escape o mediante su botón.
 * @param props Texto de búsqueda, etiquetas accesibles y callback de cambios.
 * @returns Campo de búsqueda de películas.
 */
function BuscadorPeliculas({
    busqueda,
    onBusquedaChange,
    placeholder = "Buscar películas...",
    label = "Buscar una película",
    id,
    className = "",
}: BuscadorPeliculasProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const fallbackId = useId();
    const inputId = id ?? `busqueda-${fallbackId}`;

    return (
        <div className={`buscador ${className}`.trim()}>
            <label htmlFor={inputId} className="visualmente-oculto">
                {label}
            </label>
            <div className="campo-busqueda-peliculas">
                <SearchIcon size={18} className="icono-busqueda-peliculas" />
                <input
                    ref={inputRef}
                    id={inputId}
                    type="search"
                    value={busqueda}
                    onChange={(evento) => onBusquedaChange(evento.target.value)}
                    onKeyDown={(evento) => {
                        if (evento.key === "Escape" && busqueda)
                            onBusquedaChange("");
                    }}
                    placeholder={placeholder}
                    autoComplete="off"
                />
                {busqueda && (
                    <button
                        type="button"
                        className="borrar-busqueda-peliculas"
                        aria-label="Borrar búsqueda"
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
