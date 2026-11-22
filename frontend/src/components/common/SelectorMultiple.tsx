import "../../pages/CinemasPage.css";

// Componentes
/** Punto de entrada común para selectores, grupos, cercanía y chips de filtros. */
export { SelectorMultiple } from "./filtros/SelectorMultiple";
export { SelectorUnico } from "./filtros/SelectorUnico";
export { GrupoFiltros } from "./filtros/GrupoFiltros";
export { BotonCercania } from "./filtros/BotonCercania";
export { ChipsFiltrosActivos } from "./filtros/ChipsFiltrosActivos";
export { SelectorDesplegable } from "./filtros/SelectorDesplegable";
export { BuscadorOpciones } from "./filtros/BuscadorOpciones";

// Tipos
export type {
    OpcionFiltro,
    ChipFiltroActivo,
    SelectorMultipleProps,
    SelectorUnicoProps,
    GrupoFiltrosProps,
    BotonCercaniaProps,
    ChipsFiltrosActivosProps,
} from "./filtros/types";
