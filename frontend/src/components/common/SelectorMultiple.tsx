import { useId, useRef, useState, type ReactNode, type RefObject } from "react";
import { Drawer, Popover, type FloatingPosition } from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { CloseIcon, MapPinIcon, SearchIcon } from "./Icons";
import { normalizarTexto } from "../../utils/normalizarTexto";
import "../../pages/CinemasPage.css";

export interface OpcionFiltro {
    valor: string;
    nombre: string;
    cantidad: number;
}

interface SelectorDesplegableProps {
    abierto: boolean;
    onAbrir?: () => void;
    onAlternar: () => void;
    onCerrar: () => void;
    focusAlAbrirRef?: RefObject<HTMLInputElement | null>;
    posicion?: FloatingPosition;
    titulo: string;
    etiqueta: string;
    ariaLabel: string;
    tieneSeleccion: boolean;
    cerrarLabel: string;
    className?: string;
    disabled?: boolean;
    children: ReactNode;
}

/**
 * Contenedor desplegable compartido para selectores simples y múltiples.
 * Usa Popover (Floating UI + Portal) en desktop y Drawer inferior en móvil.
 */
function SelectorDesplegable({
    abierto,
    onAbrir,
    onAlternar,
    onCerrar,
    focusAlAbrirRef,
    posicion = "bottom-end",
    titulo,
    etiqueta,
    ariaLabel,
    tieneSeleccion,
    cerrarLabel,
    className = "",
    disabled = false,
    children,
}: SelectorDesplegableProps) {
    const esMovil = useMediaQuery("(max-width: 600px), (max-width: 960px) and (max-height: 500px)") ?? false;
    const panelId = useId();
    const tituloId = useId();

    const enfocarAlAbrir = () => {
        focusAlAbrirRef?.current?.focus({ preventScroll: true });
    };

    const disparador = (
        <button
            type="button"
            className={`cines-comunas-trigger ${tieneSeleccion ? "activo" : ""}`.trim()}
            aria-label={ariaLabel}
            aria-expanded={abierto}
            aria-controls={abierto ? panelId : undefined}
            disabled={disabled}
            onKeyDown={(event) => {
                if (event.key === "Escape" && abierto) {
                    event.preventDefault();
                    onCerrar();
                }
            }}
            onClick={() => {
                if (!abierto) onAbrir?.();
                onAlternar();
            }}
        >
            <span>{etiqueta}</span>
            <span className="cines-comunas-chevron" aria-hidden="true" />
        </button>
    );

    const contenidoPanel = (
        <>
            <div className="cines-comunas-panel-header">
                <strong id={tituloId}>{titulo}</strong>
                <button
                    type="button"
                    className="cines-icon-button"
                    onClick={onCerrar}
                    aria-label={cerrarLabel}
                    title="Cerrar"
                >
                    <CloseIcon size={16} />
                </button>
            </div>
            {children}
        </>
    );

    if (esMovil) {
        return (
            <div className={`cines-comunas-selector ${className}`.trim()}>
                {disparador}
                <Drawer.Root
                    opened={abierto}
                    onClose={onCerrar}
                    position="bottom"
                    size="auto"
                    padding={0}
                    zIndex={1200}
                    shadow="none"
                    returnFocus
                    transitionProps={{
                        duration: 220,
                        exitDuration: 160,
                        timingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
                    }}
                    onEnterTransitionEnd={enfocarAlAbrir}
                >
                    <Drawer.Overlay color="#000" backgroundOpacity={0.48} blur={3} />
                    <Drawer.Content
                        id={panelId}
                        classNames={{ content: "cines-comunas-panel cines-comunas-panel--drawer" }}
                        aria-labelledby={tituloId}
                    >
                        {contenidoPanel}
                    </Drawer.Content>
                </Drawer.Root>
            </div>
        );
    }

    return (
        <div className={`cines-comunas-selector ${className}`.trim()}>
            <Popover
                opened={abierto}
                onChange={(siguienteAbierto) => {
                    if (!siguienteAbierto) onCerrar();
                }}
                position={posicion}
                width={focusAlAbrirRef ? "320px" : "max-content"}
                offset={8}
                middlewares={{ flip: true, shift: { padding: 12 }, size: { padding: 12 } }}
                returnFocus
                transitionProps={{ transition: "fade", duration: 150, exitDuration: 110 }}
                onEnterTransitionEnd={enfocarAlAbrir}
                disabled={disabled}
            >
                <Popover.Target>{disparador}</Popover.Target>
                <Popover.Dropdown
                    className="cines-comunas-panel cines-comunas-panel--popover"
                    aria-labelledby={tituloId}
                >
                    {contenidoPanel}
                </Popover.Dropdown>
            </Popover>
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
    posicion?: FloatingPosition;
    className?: string;
    disabled?: boolean;
}

const mismasSeleccionadas = (a: string[], b: string[]) =>
    a.length === b.length && a.every((valor) => b.includes(valor));

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
    posicion = "bottom-end",
    className = "",
    disabled = false,
}: SelectorMultipleProps) {
    const [busqueda, setBusqueda] = useState("");
    const [borrador, setBorrador] = useState<string[]>(seleccionadas);
    const buscador = useRef<HTMLInputElement>(null);
    const [abierto, { close, toggle }] = useDisclosure(false);

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
            abierto={abierto}
            onAlternar={toggle}
            onCerrar={close}
            focusAlAbrirRef={conBusqueda ? buscador : undefined}
            posicion={posicion}
            titulo={titulo}
            etiqueta={etiqueta}
            ariaLabel={`${ariaLabelPrefijo}: ${etiqueta}`}
            tieneSeleccion={seleccionadas.length > 0}
            cerrarLabel={`Cerrar selector de ${etiquetaPlural}`}
            className={className}
            disabled={disabled}
            onAbrir={() => {
                setBusqueda("");
                setBorrador(seleccionadas);
            }}
        >
            {conBusqueda && (
                <div className="cines-comunas-busqueda">
                    <SearchIcon size={15} />
                    <input
                        ref={buscador}
                        data-autofocus
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
                            checked={borrador.includes(opcion.valor)}
                            onChange={(event) =>
                                setBorrador((prev) =>
                                    event.target.checked
                                        ? prev.includes(opcion.valor)
                                            ? prev
                                            : [...prev, opcion.valor]
                                        : prev.filter((valor) => valor !== opcion.valor),
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
                {borrador.length > 0 && (
                    <button
                        type="button"
                        className="cines-comunas-limpiar"
                        onClick={() => {
                            setBorrador([]);
                            if (seleccionadas.length > 0) onChange([]);
                        }}
                    >
                        Quitar selección
                    </button>
                )}
                <button
                    type="button"
                    className="cines-comunas-listo"
                    onClick={() => {
                        if (!mismasSeleccionadas(borrador, seleccionadas)) onChange(borrador);
                        close();
                    }}
                >
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
    posicion?: FloatingPosition;
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
    posicion = "bottom-end",
    className = "",
    disabled = false,
}: SelectorUnicoProps) {
    const [abierto, { close, toggle }] = useDisclosure(false);
    const etiqueta = opciones.find((opcion) => opcion.valor === seleccionada)?.nombre ?? etiquetaVacia;

    return (
        <SelectorDesplegable
            abierto={abierto}
            onAlternar={toggle}
            onCerrar={close}
            posicion={posicion}
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
                                close();
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
            {Boolean(seleccionada) && (
                <div className="cines-comunas-panel-footer">
                    <button
                        type="button"
                        className="cines-comunas-limpiar"
                        onClick={() => {
                            onChange("");
                            close();
                        }}
                    >
                        Quitar selección
                    </button>
                </div>
            )}
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
