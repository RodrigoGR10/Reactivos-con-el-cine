import {
    createContext,
    useContext,
    useEffect,
    useId,
    useMemo,
    useRef,
    useState,
    type ReactNode,
    type RefObject,
} from "react";
import {
    Accordion,
    Badge,
    Checkbox,
    Drawer,
    Group,
    Indicator,
    Loader,
    Popover,
    Tooltip,
    type FloatingPosition,
} from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { CloseIcon, MapPinIcon, SearchIcon, SlidersIcon } from "./Icons";
import { useEsMovilFiltros } from "../../hooks/useEsMovilFiltros";
import { normalizarTexto } from "../../utils/normalizarTexto";
import "../../pages/CinemasPage.css";

const TOOLTIP_EVENTS_DESKTOP = { hover: true, focus: true, touch: false } as const;

interface RegistroFiltroGrupo {
    commit: () => void;
    clear: () => void;
}

interface GrupoFiltrosCtx {
    registrar: (id: string, handler: RegistroFiltroGrupo) => () => void;
    actualizarConteo: (id: string, cantidad: number) => void;
}

const GrupoFiltrosContext = createContext<GrupoFiltrosCtx | null>(null);

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
    const esMovil = useEsMovilFiltros();
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

interface PanelOpcionesMultipleProps {
    conBusqueda: boolean;
    buscadorRef: RefObject<HTMLInputElement | null>;
    autoFocusBusqueda?: boolean;
    busqueda: string;
    onBusquedaChange: (valor: string) => void;
    placeholderBusqueda: string;
    visibles: OpcionFiltro[];
    seleccionadas: readonly string[];
    onAlternar: (valor: string, marcada: boolean) => void;
    mensajeVacio: string;
}

function PanelOpcionesMultiple({
    conBusqueda,
    buscadorRef,
    autoFocusBusqueda = true,
    busqueda,
    onBusquedaChange,
    placeholderBusqueda,
    visibles,
    seleccionadas,
    onAlternar,
    mensajeVacio,
}: PanelOpcionesMultipleProps) {
    return (
        <>
            {conBusqueda && (
                <div className="cines-comunas-busqueda">
                    <SearchIcon size={15} />
                    <input
                        ref={buscadorRef}
                        data-autofocus={autoFocusBusqueda ? true : undefined}
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
                                buscadorRef.current?.focus();
                            }}
                            aria-label="Limpiar búsqueda"
                        >
                            <CloseIcon size={14} />
                        </button>
                    )}
                </div>
            )}
            <div className="cines-comunas-opciones">
                {visibles.map((opcion) => (
                    <label key={opcion.valor} className="cines-comuna-opcion">
                        <Checkbox
                            size="xs"
                            color="cine"
                            checked={seleccionadas.includes(opcion.valor)}
                            onChange={(event) =>
                                onAlternar(opcion.valor, event.currentTarget.checked)
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
        </>
    );
}

function SeccionAcordeon({
    titulo,
    etiquetaActiva,
    disabled = false,
    children,
}: {
    titulo: string;
    etiquetaActiva?: string;
    disabled?: boolean;
    children: ReactNode;
}) {
    return (
        <Accordion.Item value={titulo}>
            <Accordion.Control disabled={disabled}>
                <Group justify="space-between" gap="xs" wrap="nowrap" pr="xs">
                    <span>{titulo}</span>
                    {etiquetaActiva && (
                        <Badge size="sm" variant="outline" color="var(--color-acento)">
                            {etiquetaActiva}
                        </Badge>
                    )}
                </Group>
            </Accordion.Control>
            <Accordion.Panel>{children}</Accordion.Panel>
        </Accordion.Item>
    );
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
    posicion = "bottom-end",
    className = "",
    disabled = false,
}: SelectorMultipleProps) {
    const grupo = useContext(GrupoFiltrosContext);
    const filtroId = useId();
    const [busqueda, setBusqueda] = useState("");
    const [borrador, setBorrador] = useState<string[]>(seleccionadas);
    const buscador = useRef<HTMLInputElement>(null);
    const [abierto, { close, toggle }] = useDisclosure(false);

    const estadoRef = useRef({ borrador, seleccionadas, onChange });
    useEffect(() => {
        estadoRef.current = { borrador, seleccionadas, onChange };
    }, [borrador, seleccionadas, onChange]);

    useEffect(() => {
        if (!grupo) return;
        grupo.actualizarConteo(filtroId, estadoRef.current.borrador.length);
        return grupo.registrar(filtroId, {
            commit: () => {
                const {
                    borrador: draft,
                    seleccionadas: actuales,
                    onChange: aplicar,
                } = estadoRef.current;
                if (!mismasSeleccionadas(draft, actuales)) {
                    aplicar(draft);
                }
            },
            clear: () => {
                estadoRef.current = { ...estadoRef.current, borrador: [] };
                setBorrador([]);
            },
        });
    }, [grupo, filtroId]);

    const activa = grupo ? borrador : seleccionadas;
    const etiqueta =
        activa.length === 1
            ? opciones.find((opcion) => opcion.valor === activa[0])?.nombre ?? etiquetaSingular
            : activa.length
              ? `${activa.length} ${etiquetaPlural}`
              : etiquetaTodas;

    const termino = normalizarTexto(busqueda.trim());
    const visibles = termino
        ? opciones.filter((opcion) => normalizarTexto(opcion.nombre).includes(termino) || opcion.valor.includes(termino))
        : opciones;

    const actualizarLista = (lista: string[], valor: string, marcada: boolean) =>
        marcada
            ? lista.includes(valor)
                ? lista
                : [...lista, valor]
            : lista.filter((item) => item !== valor);

    if (grupo) {
        return (
            <SeccionAcordeon
                titulo={titulo}
                etiquetaActiva={borrador.length > 0 ? etiqueta : undefined}
                disabled={disabled}
            >
                <PanelOpcionesMultiple
                    conBusqueda={conBusqueda}
                    buscadorRef={buscador}
                    autoFocusBusqueda={false}
                    busqueda={busqueda}
                    onBusquedaChange={setBusqueda}
                    placeholderBusqueda={placeholderBusqueda}
                    visibles={visibles}
                    seleccionadas={borrador}
                    onAlternar={(valor, marcada) => {
                        const siguiente = actualizarLista(borrador, valor, marcada);
                        setBorrador(siguiente);
                        grupo.actualizarConteo(filtroId, siguiente.length);
                    }}
                    mensajeVacio={mensajeVacio}
                />
            </SeccionAcordeon>
        );
    }

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
            <PanelOpcionesMultiple
                conBusqueda={conBusqueda}
                buscadorRef={buscador}
                busqueda={busqueda}
                onBusquedaChange={setBusqueda}
                placeholderBusqueda={placeholderBusqueda}
                visibles={visibles}
                seleccionadas={borrador}
                onAlternar={(valor, marcada) =>
                    setBorrador((prev) => actualizarLista(prev, valor, marcada))
                }
                mensajeVacio={mensajeVacio}
            />
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

function ListaOpcionesUnico({
    titulo,
    opciones,
    seleccionada,
    onElegir,
}: {
    titulo: string;
    opciones: OpcionFiltro[];
    seleccionada: string;
    onElegir: (valor: string) => void;
}) {
    return (
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
                        onClick={() => onElegir(activa ? "" : opcion.valor)}
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
    );
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
    const grupo = useContext(GrupoFiltrosContext);
    const filtroId = useId();
    const [borrador, setBorrador] = useState(seleccionada);
    const [abierto, { close, toggle }] = useDisclosure(false);

    const estadoRef = useRef({ borrador, seleccionada, onChange });
    useEffect(() => {
        estadoRef.current = { borrador, seleccionada, onChange };
    }, [borrador, seleccionada, onChange]);

    useEffect(() => {
        if (!grupo) return;
        grupo.actualizarConteo(filtroId, estadoRef.current.borrador ? 1 : 0);
        return grupo.registrar(filtroId, {
            commit: () => {
                const {
                    borrador: draft,
                    seleccionada: actual,
                    onChange: aplicar,
                } = estadoRef.current;
                if (draft !== actual) {
                    aplicar(draft);
                }
            },
            clear: () => {
                estadoRef.current = { ...estadoRef.current, borrador: "" };
                setBorrador("");
            },
        });
    }, [grupo, filtroId]);

    const activa = grupo ? borrador : seleccionada;
    const etiqueta = opciones.find((opcion) => opcion.valor === activa)?.nombre ?? etiquetaVacia;

    if (grupo) {
        return (
            <SeccionAcordeon
                titulo={titulo}
                etiquetaActiva={borrador ? etiqueta : undefined}
                disabled={disabled}
            >
                <ListaOpcionesUnico
                    titulo={titulo}
                    opciones={opciones}
                    seleccionada={borrador}
                    onElegir={(siguiente) => {
                        setBorrador(siguiente);
                        grupo.actualizarConteo(filtroId, siguiente ? 1 : 0);
                    }}
                />
            </SeccionAcordeon>
        );
    }

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
            <ListaOpcionesUnico
                titulo={titulo}
                opciones={opciones}
                seleccionada={seleccionada}
                onElegir={(valor) => {
                    onChange(valor);
                    close();
                }}
            />
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

interface GrupoFiltrosProps {
    cantidadActivos: number;
    disabled?: boolean;
    children: ReactNode;
}

/**
 * En escritorio muestra los selectores directamente; en móvil los agrupa en un
 * botón compacto con indicador numérico que abre un Drawer con Accordion de Mantine
 * confirmando los cambios al pulsar "Listo".
 */
export function GrupoFiltros({
    cantidadActivos,
    disabled = false,
    children,
}: GrupoFiltrosProps) {
    const esMovil = useEsMovilFiltros();
    const [abierto, { open, close }] = useDisclosure(false);
    const [sesion, setSesion] = useState(0);
    const [conteos, setConteos] = useState<Record<string, number>>({});
    const handlersRef = useRef(new Map<string, RegistroFiltroGrupo>());
    const panelId = useId();
    const tituloId = useId();

    const ctx = useMemo<GrupoFiltrosCtx>(
        () => ({
            registrar: (id, handler) => {
                handlersRef.current.set(id, handler);
                return () => {
                    handlersRef.current.delete(id);
                };
            },
            actualizarConteo: (id, cantidad) => {
                setConteos((prev) =>
                    prev[id] === cantidad ? prev : { ...prev, [id]: cantidad },
                );
            },
        }),
        [],
    );

    if (!esMovil) {
        return <>{children}</>;
    }

    const totalBorrador = Object.values(conteos).reduce((sum, n) => sum + n, 0);

    const abrirDrawer = () => {
        setConteos({});
        setSesion((n) => n + 1);
        open();
    };

    const limpiarBorradores = () => {
        for (const handler of handlersRef.current.values()) {
            handler.clear();
        }
        setConteos({});
    };

    const aplicar = () => {
        for (const handler of handlersRef.current.values()) {
            handler.commit();
        }
        close();
    };

    return (
        <>
            <Indicator
                label={cantidadActivos}
                size={18}
                offset={4}
                color="var(--color-acento)"
                disabled={cantidadActivos === 0}
            >
                <button
                    type="button"
                    className={`cines-comunas-trigger filtros-movil-trigger ${cantidadActivos > 0 ? "activo" : ""}`.trim()}
                    aria-label={
                        cantidadActivos > 0
                            ? `Filtros (${cantidadActivos} activos)`
                            : "Abrir filtros"
                    }
                    aria-expanded={abierto}
                    aria-controls={abierto ? panelId : undefined}
                    disabled={disabled}
                    onClick={abrirDrawer}
                >
                    <SlidersIcon size={18} />
                </button>
            </Indicator>

            <Drawer.Root
                opened={abierto}
                onClose={close}
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
            >
                <Drawer.Overlay color="#000" backgroundOpacity={0.48} blur={3} />
                <Drawer.Content
                    id={panelId}
                    classNames={{
                        content:
                            "cines-comunas-panel cines-comunas-panel--drawer filtros-movil-drawer",
                    }}
                    aria-labelledby={tituloId}
                >
                    <div className="cines-comunas-panel-header">
                        <strong id={tituloId}>Filtros</strong>
                        <button
                            type="button"
                            className="cines-icon-button"
                            onClick={close}
                            aria-label="Cerrar filtros"
                        >
                            <CloseIcon size={16} />
                        </button>
                    </div>
                    <div className="filtros-movil-accordion-scroll">
                        <GrupoFiltrosContext.Provider value={ctx}>
                            <Accordion
                                key={sesion}
                                variant="separated"
                                radius="md"
                                className="filtros-movil-accordion"
                            >
                                {children}
                            </Accordion>
                        </GrupoFiltrosContext.Provider>
                    </div>
                    <div className="cines-comunas-panel-footer">
                        {totalBorrador > 0 && (
                            <button
                                type="button"
                                className="cines-comunas-limpiar"
                                onClick={limpiarBorradores}
                            >
                                Quitar selección
                            </button>
                        )}
                        <button
                            type="button"
                            className="cines-comunas-listo"
                            onClick={aplicar}
                        >
                            Listo
                        </button>
                    </div>
                </Drawer.Content>
            </Drawer.Root>
        </>
    );
}

interface BotonCercaniaProps {
    activo: boolean;
    cargando: boolean;
    onToggle: () => void;
    tituloInactivo?: string;
    tituloActivo?: string;
    compacto?: boolean;
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
    tituloActivo = "Desactivar cercanía",
    compacto = false,
    className = "",
}: BotonCercaniaProps) {
    const desactivarTooltip =
        useMediaQuery("(max-width: 600px), (hover: none), (pointer: coarse)") ?? false;
    const etiquetaTooltip = activo ? tituloActivo : tituloInactivo;

    return (
        <Tooltip
            label={etiquetaTooltip}
            position="bottom"
            offset={8}
            openDelay={250}
            floatingStrategy="fixed"
            disabled={desactivarTooltip || cargando}
            events={TOOLTIP_EVENTS_DESKTOP}
        >
            <button
                type="button"
                className={`boton-cercania-cine ${compacto ? "boton-cercania-cine--compacto" : ""} ${activo ? "activo" : ""} ${className}`.trim()}
                aria-label={
                    compacto
                        ? cargando
                            ? "Obteniendo ubicación"
                            : etiquetaTooltip
                        : undefined
                }
                aria-pressed={activo}
                onClick={onToggle}
                disabled={cargando}
            >
                {cargando ? (
                    <Loader size={15} color="currentColor" aria-hidden="true" />
                ) : (
                    <MapPinIcon size={compacto ? 17 : 16} />
                )}
                {!compacto && <span>{cargando ? "Ubicando..." : "Cerca de mí"}</span>}
            </button>
        </Tooltip>
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
                >
                    <span>{chip.etiqueta}</span>
                    <CloseIcon size={13} />
                </button>
            ))}
        </div>
    );
}
