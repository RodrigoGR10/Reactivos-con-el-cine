import { CloseIcon, SearchIcon } from "../Icons";
import type { BuscadorOpcionesProps } from "./types";

/**
 * Campo controlado para buscar dentro de las opciones de un selector.
 * @param props Texto, callback, placeholder y referencia opcional del input.
 * @returns Elemento de interfaz que representa el componente con las propiedades recibidas.
 */
export function BuscadorOpciones({
    buscadorRef,
    autoFocus = true,
    busqueda,
    onBusquedaChange,
    placeholderBusqueda,
}: BuscadorOpcionesProps) {
    return (
        <div className="cines-comunas-busqueda">
            <SearchIcon size={15} />
            <input
                ref={buscadorRef}
                data-autofocus={autoFocus ? true : undefined}
                value={busqueda}
                onChange={(event) => onBusquedaChange(event.target.value)}
                aria-label={placeholderBusqueda.replace(/\.+$/, "")}
                placeholder={placeholderBusqueda}
            />
            {busqueda && (
                <button
                    type="button"
                    className="cines-comunas-busqueda-limpiar"
                    onClick={() => {
                        onBusquedaChange("");
                        buscadorRef?.current?.focus();
                    }}
                    aria-label="Limpiar búsqueda"
                >
                    <CloseIcon size={14} />
                </button>
            )}
        </div>
    );
}
