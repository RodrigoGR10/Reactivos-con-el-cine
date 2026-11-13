import { useEffect, useId, useRef, useState } from "react";
import { CloseIcon, SearchIcon } from "./Icons";
import { normalizarTexto } from "../../utils/normalizarTexto";
import "../../pages/CinemasPage.css";

export interface OpcionFiltro {
    valor: string;
    nombre: string;
    cantidad: number;
}

interface SelectorMultipleProps {
    opciones: OpcionFiltro[];
    seleccionadas: string[];
    onChange: (valores: string[]) => void;
    titulo: string;
    etiquetaTodas: string;
    etiquetaPlural: string;
    etiquetaSingular?: string;
    ariaLabelPrefijo: string;
    conBusqueda?: boolean;
    placeholderBusqueda?: string;
    mensajeVacio?: string;
    className?: string;
    disabled?: boolean;
}

/**
 * Selector múltiple desplegable con casillas, conteo por opción y búsqueda opcional.
 */
export function SelectorMultiple({
    opciones,
    seleccionadas,
    onChange,
    titulo,
    etiquetaTodas,
    etiquetaPlural,
    etiquetaSingular = `1 ${etiquetaPlural.replace(/s$/, "")}`,
    ariaLabelPrefijo,
    conBusqueda = false,
    placeholderBusqueda = "Buscar...",
    mensajeVacio = "No se encontraron opciones.",
    className = "",
    disabled = false,
}: SelectorMultipleProps) {
    const [abierto, setAbierto] = useState(false);
    const [busqueda, setBusqueda] = useState("");
    const contenedor = useRef<HTMLDivElement>(null);
    const boton = useRef<HTMLButtonElement>(null);
    const buscador = useRef<HTMLInputElement>(null);
    const panelId = useId();
    const tituloId = useId();

    useEffect(() => {
        if (!abierto) return;
        if (conBusqueda) buscador.current?.focus();
        const cerrarFuera = (event: PointerEvent) => {
            if (event.target instanceof Node && !contenedor.current?.contains(event.target)) {
                setAbierto(false);
            }
        };
        document.addEventListener("pointerdown", cerrarFuera);
        return () => document.removeEventListener("pointerdown", cerrarFuera);
    }, [abierto, conBusqueda]);

    const cerrar = (devolverFoco = false) => {
        setAbierto(false);
        if (devolverFoco) boton.current?.focus();
    };

    const etiqueta =
        seleccionadas.length === 1
            ? opciones.find((opcion) => opcion.valor === seleccionadas[0])?.nombre ?? etiquetaSingular
            : seleccionadas.length
              ? `${seleccionadas.length} ${etiquetaPlural}`
              : etiquetaTodas;

    const termino = normalizarTexto(busqueda.trim());
    const visibles = termino
        ? opciones.filter((opcion) => normalizarTexto(opcion.nombre).includes(termino) || opcion.valor.includes(termino))
        : opciones;

    return (
        <div
            ref={contenedor}
            className={`cines-comunas-selector ${className}`.trim()}
            onKeyDown={(event) => {
                if (event.key === "Escape" && abierto) {
                    event.preventDefault();
                    cerrar(true);
                }
            }}
            onBlur={(event) => {
                if (
                    event.relatedTarget instanceof Node &&
                    !event.currentTarget.contains(event.relatedTarget)
                ) {
                    setAbierto(false);
                }
            }}
        >
            <button
                ref={boton}
                type="button"
                className="cines-comunas-trigger"
                aria-label={`${ariaLabelPrefijo}: ${etiqueta}`}
                aria-expanded={abierto}
                aria-controls={panelId}
                disabled={disabled}
                onClick={() => {
                    setBusqueda("");
                    setAbierto((prev) => !prev);
                }}
            >
                <span>{etiqueta}</span>
                <span className="cines-comunas-chevron" aria-hidden="true" />
            </button>
            {abierto && (
                <div className="cines-comunas-panel" id={panelId} role="group" aria-labelledby={tituloId}>
                    <div className="cines-comunas-panel-header">
                        <strong id={tituloId}>{titulo}</strong>
                        <button
                            type="button"
                            className="cines-icon-button"
                            onClick={() => cerrar()}
                            aria-label={`Cerrar selector de ${etiquetaPlural}`}
                            title="Cerrar"
                        >
                            <CloseIcon size={16} />
                        </button>
                    </div>
                    {conBusqueda && (
                        <div className="cines-comunas-busqueda">
                            <SearchIcon size={15} />
                            <input
                                ref={buscador}
                                value={busqueda}
                                onChange={(event) => setBusqueda(event.target.value)}
                                aria-label={placeholderBusqueda.replace(/\.+$/, "")}
                                placeholder={placeholderBusqueda}
                            />
                        </div>
                    )}
                    <div className="cines-comunas-opciones">
                        {visibles.map((opcion) => (
                            <label key={opcion.valor} className="cines-comuna-opcion">
                                <input
                                    type="checkbox"
                                    checked={seleccionadas.includes(opcion.valor)}
                                    onChange={(event) =>
                                        onChange(
                                            event.target.checked
                                                ? [...seleccionadas, opcion.valor]
                                                : seleccionadas.filter((valor) => valor !== opcion.valor),
                                        )
                                    }
                                />
                                <span>{opcion.nombre}</span>
                                <span className="cines-comuna-cantidad" aria-hidden="true">
                                    {opcion.cantidad}
                                </span>
                            </label>
                        ))}
                        {!visibles.length && <p className="cines-comunas-vacio">{mensajeVacio}</p>}
                    </div>
                    <div className="cines-comunas-panel-footer">
                        <button
                            type="button"
                            className="cines-comunas-limpiar"
                            disabled={!seleccionadas.length}
                            onClick={() => onChange([])}
                        >
                            Quitar selección
                        </button>
                        <button type="button" className="cines-comunas-listo" onClick={() => cerrar()}>
                            Listo
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
