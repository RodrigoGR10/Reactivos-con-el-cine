import type { FloatingPosition } from "@mantine/core";
import type { ReactNode, RefObject } from "react";

export interface OpcionFiltro {
  valor: string;
  nombre: string;
  cantidad: number;
}

export interface RegistroFiltroGrupo {
  commit: () => void;
  clear: () => void;
}

export interface GrupoFiltrosCtx {
  registrar: (id: string, handler: RegistroFiltroGrupo) => () => void;
  actualizarConteo: (id: string, cantidad: number) => void;
}

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

export interface BuscadorOpcionesProps {
  buscadorRef?: RefObject<HTMLInputElement | null>;
  autoFocus?: boolean;
  busqueda: string;
  onBusquedaChange: (valor: string) => void;
  placeholderBusqueda: string;
}

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

export interface GrupoFiltrosProps {
  cantidadActivos: number;
  disabled?: boolean;
  children: ReactNode;
}

export interface BotonCercaniaProps {
  activo: boolean;
  cargando: boolean;
  onToggle: () => void;
  tituloInactivo?: string;
  tituloActivo?: string;
  compacto?: boolean;
  className?: string;
}

export interface ChipFiltroActivo {
  id: string;
  etiqueta: string;
  ariaLabel: string;
  onQuitar: () => void;
}

export interface ChipsFiltrosActivosProps {
  chips: ChipFiltroActivo[];
  ariaLabel?: string;
}
