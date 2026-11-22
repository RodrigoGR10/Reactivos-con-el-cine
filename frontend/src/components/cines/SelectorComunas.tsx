import type { OpcionComuna } from "../../utils/agruparCines";
import { SelectorMultiple } from "../common/SelectorMultiple";

interface SelectorComunasProps {
    opciones: OpcionComuna[];
    seleccionadas: string[];
    onChange: (comunas: string[]) => void;
    className?: string;
}

/**
 * Selector múltiple para filtrar cines por comuna.
 * @param opciones Comunas disponibles y su conteo.
 * @param seleccionadas Valores de comuna activos.
 * @param onChange Callback con la lista actualizada.
 * @param className Clase CSS opcional para personalizar el selector.
 * @returns Elemento de interfaz que representa el componente con las propiedades recibidas.
 */
export function SelectorComunas({
    opciones,
    seleccionadas,
    onChange,
    className = "",
}: SelectorComunasProps) {
    return (
        <SelectorMultiple
            className={className}
            opciones={opciones}
            seleccionadas={seleccionadas}
            onChange={onChange}
            titulo="Comunas"
            etiquetaTodas="Comunas"
            etiquetaPlural="comunas"
            etiquetaSingular="1 comuna"
            ariaLabelPrefijo="Filtrar por comunas"
            conBusqueda
            placeholderBusqueda="Buscar comuna..."
            mensajeVacio="No se encontraron comunas."
        />
    );
}
