import { CloseIcon } from "../Icons";
import type { ChipsFiltrosActivosProps } from "./types";

/**
 * Muestra los filtros activos como chips que pueden quitarse individualmente.
 * @param chips Lista de etiquetas, roles accesibles y acciones para quitarlas.
 * @param ariaLabel Nombre accesible opcional del grupo de chips.
 * @returns Elemento de interfaz que representa el componente con las propiedades recibidas.
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
