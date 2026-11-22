import type { FloatingPosition } from "@mantine/core";
import type { ReactNode, RefObject } from "react";

/** Elemento común de una lista de opciones desplegable. */
export interface OpcionFiltro {
    valor: string;
    nombre: string;
    cantidad: number;
}

/**
 * Registro de una instancia de grupo de filtros y sus acciones.
 */
export interface RegistroFiltroGrupo {
    commit: () => void;
    clear: () => void;
}

/**
 * Conjunto de registros agrupados durante la interfaz.
 */
export interface GrupoFiltrosCtx {
    registrar: (id: string, handler: RegistroFiltroGrupo) => () => void;
    actualizarConteo: (id: string, cantidad: number) => void;
}

/**
 * Propiedades que configuran el componente SelectorDesplegable.
 */
export interface SelectorDesplegableProps {
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

/** Props del selector que permite mantener varias opciones activas. */
export interface SelectorMultipleProps {
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

/**
 * Propiedades que configuran el componente BuscadorOpciones.
 */
export interface BuscadorOpcionesProps {
    buscadorRef?: RefObject<HTMLInputElement | null>;
    autoFocus?: boolean;
    busqueda: string;
    onBusquedaChange: (valor: string) => void;
    placeholderBusqueda: string;
}

/**
 * Propiedades que configuran el componente PanelOpcionesMultiple.
 */
export interface PanelOpcionesMultipleProps {
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

/** Props del selector que mantiene como máximo una opción activa. */
export interface SelectorUnicoProps {
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
    conBusqueda?: boolean;
    placeholderBusqueda?: string;
    mensajeVacio?: string;
    mostrarCantidad?: boolean;
    deseleccionable?: boolean;
}

/** Props del contenedor que agrupa filtros y coordina su confirmación móvil. */
export interface GrupoFiltrosProps {
    cantidadActivos: number;
    disabled?: boolean;
    children: ReactNode;
}

/** Props del control para ordenar resultados por cercanía. */
export interface BotonCercaniaProps {
    activo: boolean;
    cargando: boolean;
    onToggle: () => void;
    tituloInactivo?: string;
    tituloActivo?: string;
    compacto?: boolean;
    className?: string;
}

/**
 * Etiqueta activa y acción para quitar un filtro aplicado.
 */
export interface ChipFiltroActivo {
    id: string;
    etiqueta: string;
    ariaLabel: string;
    onQuitar: () => void;
}

/** Props del resumen visual de filtros seleccionados. */
export interface ChipsFiltrosActivosProps {
    chips: ChipFiltroActivo[];
    ariaLabel?: string;
}
