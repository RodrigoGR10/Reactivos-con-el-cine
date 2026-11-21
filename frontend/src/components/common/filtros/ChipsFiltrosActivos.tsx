import { CloseIcon } from "../Icons";
import type { ChipsFiltrosActivosProps } from "./types";

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
