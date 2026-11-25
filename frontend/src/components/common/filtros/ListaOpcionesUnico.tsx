import { BuscadorOpciones } from "./BuscadorOpciones";
import type { RefObject } from "react";
import type { OpcionFiltro } from "./types";

/**
 * Presenta las opciones de un selector único y comunica la opción elegida.
 * @param props Título, opciones, selección, búsqueda y callbacks opcionales.
 * @returns Elemento de interfaz que representa el componente con las propiedades recibidas.
 */
export function ListaOpcionesUnico({
    titulo,
    opciones,
    seleccionada,
    onElegir,
    conBusqueda = false,
    buscadorRef,
    autoFocusBusqueda = true,
    busqueda = "",
    onBusquedaChange,
    placeholderBusqueda = "Buscar...",
    mensajeVacio = "No se encontraron opciones.",
    mostrarCantidad = true,
    deseleccionable = true,
}: {
    titulo: string;
    opciones: OpcionFiltro[];
    seleccionada: string;
    onElegir: (valor: string) => void;
    conBusqueda?: boolean;
    buscadorRef?: RefObject<HTMLInputElement | null>;
    autoFocusBusqueda?: boolean;
    busqueda?: string;
    onBusquedaChange?: (valor: string) => void;
    placeholderBusqueda?: string;
    mensajeVacio?: string;
    mostrarCantidad?: boolean;
    deseleccionable?: boolean;
}) {
    return (
        <>
            {conBusqueda && onBusquedaChange && (
                <BuscadorOpciones
                    buscadorRef={buscadorRef}
                    autoFocus={autoFocusBusqueda}
                    busqueda={busqueda}
                    onBusquedaChange={onBusquedaChange}
                    placeholderBusqueda={placeholderBusqueda}
                />
            )}
            <div
                className="cines-comunas-opciones"
                role="listbox"
                aria-label={titulo}
            >
                {opciones.map((opcion) => {
                    const activa = opcion.valor === seleccionada;
                    return (
                        <button
                            key={opcion.valor}
                            type="button"
                            role="option"
                            aria-selected={activa}
                            className={`cines-comuna-opcion selector-unico-opcion ${activa ? "activo" : ""}`}
                            onClick={() =>
                                onElegir(
                                    activa && deseleccionable
                                        ? ""
                                        : opcion.valor,
                                )
                            }
                        >
                            <span
                                className="selector-unico-radio"
                                aria-hidden="true"
                            />
                            <span>{opcion.nombre}</span>
                            {mostrarCantidad && (
                                <span
                                    className="cines-comuna-cantidad"
                                    aria-hidden="true"
                                >
                                    {opcion.cantidad}
                                </span>
                            )}
                        </button>
                    );
                })}
                {!opciones.length && (
                    <p className="cines-comunas-vacio">{mensajeVacio}</p>
                )}
            </div>
        </>
    );
}
