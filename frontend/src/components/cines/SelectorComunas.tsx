import { useEffect, useId, useRef, useState } from "react";
import { CloseIcon, MapPinIcon, SearchIcon } from "../common/Icons";
import { normalizarTexto } from "../../utils/normalizarTexto";
import type { OpcionComuna } from "../../utils/agruparCines";

interface SelectorComunasProps {
    opciones: OpcionComuna[];
    seleccionadas: string[];
    onChange: (comunas: string[]) => void;
}

export function SelectorComunas({ opciones, seleccionadas, onChange }: SelectorComunasProps) {
    const [abierto, setAbierto] = useState(false);
    const [busqueda, setBusqueda] = useState("");
    const contenedor = useRef<HTMLDivElement>(null);
    const boton = useRef<HTMLButtonElement>(null);
    const buscador = useRef<HTMLInputElement>(null);
    const panelId = useId();
    const tituloId = useId();

    useEffect(() => {
        if (!abierto) return;
        buscador.current?.focus();
        const cerrarFuera = (event: PointerEvent) => {
            if (event.target instanceof Node && !contenedor.current?.contains(event.target)) setAbierto(false);
        };
        document.addEventListener("pointerdown", cerrarFuera);
        return () => document.removeEventListener("pointerdown", cerrarFuera);
    }, [abierto]);

    const cerrar = () => {
        setAbierto(false);
        boton.current?.focus();
    };
    const etiqueta = seleccionadas.length === 1
        ? opciones.find((opcion) => opcion.valor === seleccionadas[0])?.nombre ?? "1 comuna"
        : seleccionadas.length ? `${seleccionadas.length} comunas` : "Todas las comunas";
    const visibles = opciones.filter((opcion) => opcion.valor.includes(normalizarTexto(busqueda.trim())));

    return (
        <div
            ref={contenedor}
            className="cines-comunas-selector"
            onKeyDown={(event) => {
                if (event.key === "Escape" && abierto) {
                    event.preventDefault();
                    cerrar();
                }
            }}
            onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setAbierto(false);
            }}
        >
            <button
                ref={boton}
                type="button"
                className={`cines-comunas-trigger ${seleccionadas.length ? "activo" : ""}`}
                aria-label={`Filtrar por comunas: ${etiqueta}`}
                aria-expanded={abierto}
                aria-controls={panelId}
                onClick={() => {
                    setBusqueda("");
                    setAbierto(!abierto);
                }}
            >
                <MapPinIcon size={17} />
                <span>{etiqueta}</span>
                <span className="cines-comunas-chevron" aria-hidden="true" />
            </button>
            {abierto && (
                <div className="cines-comunas-panel" id={panelId} role="group" aria-labelledby={tituloId}>
                    <div className="cines-comunas-panel-header">
                        <strong id={tituloId}>Comunas</strong>
                        <button type="button" className="cines-icon-button" onClick={cerrar} aria-label="Cerrar selector de comunas" title="Cerrar">
                            <CloseIcon size={16} />
                        </button>
                    </div>
                    <div className="cines-comunas-busqueda">
                        <SearchIcon size={15} />
                        <input ref={buscador} value={busqueda} onChange={(event) => setBusqueda(event.target.value)} aria-label="Buscar comuna" placeholder="Buscar comuna..." />
                    </div>
                    <div className="cines-comunas-opciones">
                        {visibles.map((opcion) => (
                            <label key={opcion.valor} className="cines-comuna-opcion">
                                <input
                                    type="checkbox"
                                    checked={seleccionadas.includes(opcion.valor)}
                                    onChange={(event) => onChange(event.target.checked
                                        ? [...seleccionadas, opcion.valor]
                                        : seleccionadas.filter((valor) => valor !== opcion.valor))}
                                />
                                <span>{opcion.nombre}</span>
                                <span className="cines-comuna-cantidad" aria-hidden="true">{opcion.cantidad}</span>
                            </label>
                        ))}
                        {!visibles.length && <p className="cines-comunas-vacio">No se encontraron comunas.</p>}
                    </div>
                    <div className="cines-comunas-panel-footer">
                        <button type="button" className="cines-comunas-limpiar" disabled={!seleccionadas.length} onClick={() => onChange([])}>Quitar selección</button>
                        <button type="button" className="cines-comunas-listo" onClick={cerrar}>Listo</button>
                    </div>
                </div>
            )}
        </div>
    );
}
