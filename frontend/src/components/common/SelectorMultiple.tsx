import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import { CloseIcon, MapPinIcon, SearchIcon } from "./Icons";
import { normalizarTexto } from "../../utils/normalizarTexto";
import "../../pages/CinemasPage.css";

export interface OpcionFiltro {
    valor: string;
    nombre: string;
    cantidad: number;
}

interface EstadoDesplegable {
    abierto: boolean;
    setAbierto: (fn: (prev: boolean) => boolean) => void;
    contenedor: RefObject<HTMLDivElement | null>;
    boton: RefObject<HTMLButtonElement | null>;
    panelId: string;
    tituloId: string;
    cerrar: (devolverFoco?: boolean) => void;
}

function useSelectorDesplegable(focusOnOpenRef?: RefObject<HTMLInputElement | null>): EstadoDesplegable {
    const [abierto, setAbierto] = useState(false);
    const contenedor = useRef<HTMLDivElement>(null);
    const boton = useRef<HTMLButtonElement>(null);
    const panelId = useId();
    const tituloId = useId();

    useEffect(() => {
        if (!abierto) return;
        focusOnOpenRef?.current?.focus();
        const cerrarFuera = (event: PointerEvent) => {
            if (event.target instanceof Node && !contenedor.current?.contains(event.target)) {
                setAbierto(false);
            }
        };
        document.addEventListener("pointerdown", cerrarFuera);
        return () => document.removeEventListener("pointerdown", cerrarFuera);
    }, [abierto, focusOnOpenRef]);

    const cerrar = (devolverFoco = false) => {
        setAbierto(false);
        if (devolverFoco) boton.current?.focus();
    };

    return { abierto, setAbierto, contenedor, boton, panelId, tituloId, cerrar };
}

interface SelectorDesplegableProps {
    estado: EstadoDesplegable;
    titulo: string;
    etiqueta: string;
    ariaLabel: string;
    tieneSeleccion: boolean;
    cerrarLabel: string;
    className?: string;
    disabled?: boolean;
    onAbrir?: () => void;
    children: ReactNode;
}

/**
 * Contenedor desplegable compartido para selectores simples y múltiples.
 */
function SelectorDesplegable({
    estado,
    titulo,
    etiqueta,
    ariaLabel,
    tieneSeleccion,
    cerrarLabel,
    className = "",
    disabled = false,
    onAbrir,
    children,
}: SelectorDesplegableProps) {
    const { abierto, setAbierto, contenedor, boton, panelId, tituloId, cerrar } = estado;

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
                    cerrar();
                }
            }}
        >
            <button
                ref={boton}
                type="button"
                className={`cines-comunas-trigger ${tieneSeleccion ? "activo" : ""}`.trim()}
                aria-label={ariaLabel}
                aria-expanded={abierto}
                aria-controls={panelId}
                disabled={disabled}
                onClick={() => {
                    onAbrir?.();
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
                            onClick={() => cerrar(true)}
                            aria-label={cerrarLabel}
                            title="Cerrar"
                        >
                            <CloseIcon size={16} />
                        </button>
                    </div>
                    {children}
                </div>
            )}
        </div>
    );
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
    const [busqueda, setBusqueda] = useState("");
    const buscador = useRef<HTMLInputElement>(null);
    const estado = useSelectorDesplegable(conBusqueda ? buscador : undefined);

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
        <SelectorDesplegable
            estado={estado}
            titulo={titulo}
            etiqueta={etiqueta}
            ariaLabel={`${ariaLabelPrefijo}: ${etiqueta}`}
            tieneSeleccion={seleccionadas.length > 0}
            cerrarLabel={`Cerrar selector de ${etiquetaPlural}`}
            className={className}
            disabled={disabled}
            onAbrir={() => setBusqueda("")}
        >
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
                <button type="button" className="cines-comunas-listo" onClick={() => estado.cerrar()}>
                    Listo
                </button>
            </div>
        </SelectorDesplegable>
    );
}

interface SelectorUnicoProps {
    opciones: OpcionFiltro[];
    seleccionada: string;
    onChange: (valor: string) => void;
    titulo: string;
    etiquetaVacia: string;
    ariaLabelPrefijo: string;
    cerrarLabel?: string;
    className?: string;
    disabled?: boolean;
}

/**
 * Selector unitario desplegable con estética unificada y selección única.
 */
export function SelectorUnico({
    opciones,
    seleccionada,
    onChange,
    titulo,
    etiquetaVacia,
    ariaLabelPrefijo,
    cerrarLabel = `Cerrar selector de ${titulo.toLowerCase()}`,
    className = "",
    disabled = false,
}: SelectorUnicoProps) {
    const estado = useSelectorDesplegable();
    const etiqueta = opciones.find((opcion) => opcion.valor === seleccionada)?.nombre ?? etiquetaVacia;

    return (
        <SelectorDesplegable
            estado={estado}
            titulo={titulo}
            etiqueta={etiqueta}
            ariaLabel={`${ariaLabelPrefijo}: ${etiqueta}`}
            tieneSeleccion={Boolean(seleccionada)}
            cerrarLabel={cerrarLabel}
            className={className}
            disabled={disabled}
        >
            <div className="cines-comunas-opciones" role="listbox" aria-label={titulo}>
                {opciones.map((opcion) => {
                    const activa = opcion.valor === seleccionada;
                    return (
                        <button
                            key={opcion.valor}
                            type="button"
                            role="option"
                            aria-selected={activa}
                            className={`cines-comuna-opcion selector-unico-opcion ${activa ? "activo" : ""}`}
                            onClick={() => {
                                onChange(activa ? "" : opcion.valor);
                                estado.cerrar(true);
                            }}
                        >
                            <span className="selector-unico-radio" aria-hidden="true" />
                            <span>{opcion.nombre}</span>
                            <span className="cines-comuna-cantidad" aria-hidden="true">
                                {opcion.cantidad}
                            </span>
                        </button>
                    );
                })}
            </div>
            <div className="cines-comunas-panel-footer">
                <button
                    type="button"
                    className="cines-comunas-limpiar"
                    disabled={!seleccionada}
                    onClick={() => {
                        onChange("");
                        estado.cerrar(true);
                    }}
                >
                    Quitar selección
                </button>
            </div>
        </SelectorDesplegable>
    );
}

interface BotonCercaniaProps {
    activo: boolean;
    cargando: boolean;
    onToggle: () => void;
    tituloInactivo?: string;
    tituloActivo?: string;
    className?: string;
}

/**
 * Botón reutilizable para activar/desactivar el ordenamiento por cercanía geográfica.
 */
export function BotonCercania({
    activo,
    cargando,
    onToggle,
    tituloInactivo = "Ordenar por cercanía",
    tituloActivo = "Volver al orden predeterminado",
    className = "",
}: BotonCercaniaProps) {
    return (
        <button
            type="button"
            className={`boton-cercania-cine ${activo ? "activo" : ""} ${className}`.trim()}
            aria-pressed={activo}
            title={activo ? tituloActivo : tituloInactivo}
            onClick={onToggle}
            disabled={cargando}
        >
            <MapPinIcon size={16} />
            <span>{cargando ? "Ubicando..." : "Cerca de mí"}</span>
        </button>
    );
}

export interface ChipFiltroActivo {
    id: string;
    etiqueta: string;
    ariaLabel: string;
    onQuitar: () => void;
}

interface ChipsFiltrosActivosProps {
    chips: ChipFiltroActivo[];
    ariaLabel?: string;
}

/**
 * Fila reutilizable de chips para visualizar y quitar filtros aplicados.
 */
export function ChipsFiltrosActivos({
    chips,
    ariaLabel = "Filtros aplicados",
}: ChipsFiltrosActivosProps) {
    if (chips.length === 0) return null;

    return (
        <div className="filtros-peliculas-aplicados" aria-label={ariaLabel}>
            {chips.map((chip) => (
                <button
                    key={chip.id}
                    type="button"
                    className="filtro-pelicula-aplicado"
                    onClick={chip.onQuitar}
                    aria-label={chip.ariaLabel}
                    title={chip.ariaLabel}
                >
                    <span>{chip.etiqueta}</span>
                    <CloseIcon size={13} />
                </button>
            ))}
        </div>
    );
}
