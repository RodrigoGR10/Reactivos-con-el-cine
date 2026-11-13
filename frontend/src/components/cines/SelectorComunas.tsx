import type { OpcionComuna } from "../../utils/agruparCines";
import { SelectorMultiple } from "../common/SelectorMultiple";

interface SelectorComunasProps {
    opciones: OpcionComuna[];
    seleccionadas: string[];
    onChange: (comunas: string[]) => void;
}

/**
 * Selector múltiple especializado para filtrar por comunas.
 */
export function SelectorComunas({ opciones, seleccionadas, onChange }: SelectorComunasProps) {
    return (
        <SelectorMultiple
            opciones={opciones}
            seleccionadas={seleccionadas}
            onChange={onChange}
            titulo="Comunas"
            etiquetaTodas="Todas las comunas"
            etiquetaPlural="comunas"
            etiquetaSingular="1 comuna"
            ariaLabelPrefijo="Filtrar por comunas"
            conBusqueda
            placeholderBusqueda="Buscar comuna..."
            mensajeVacio="No se encontraron comunas."
        />
    );
}
