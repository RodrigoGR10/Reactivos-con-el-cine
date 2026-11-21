import { Checkbox } from "@mantine/core";
import { BuscadorOpciones } from "./BuscadorOpciones";
import type { PanelOpcionesMultipleProps } from "./types";

export function PanelOpcionesMultiple({
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
                <BuscadorOpciones
                    buscadorRef={buscadorRef}
                    autoFocus={autoFocusBusqueda}
                    busqueda={busqueda}
                    onBusquedaChange={onBusquedaChange}
                    placeholderBusqueda={placeholderBusqueda}
                />
            )}
            <div className="cines-comunas-opciones">
                {visibles.map((opcion) => (
                    <label key={opcion.valor} className="cines-comuna-opcion">
                        <Checkbox
                            size="xs"
                            color="cine"
                            checked={seleccionadas.includes(opcion.valor)}
                            onChange={(event) =>
                                onAlternar(
                                    opcion.valor,
                                    event.currentTarget.checked,
                                )
                            }
                        />
                        <span>{opcion.nombre}</span>
                        <span
                            className="cines-comuna-cantidad"
                            aria-hidden="true"
                        >
                            {opcion.cantidad}
                        </span>
                    </label>
                ))}
                {!visibles.length && (
                    <p className="cines-comunas-vacio">{mensajeVacio}</p>
                )}
            </div>
        </>
    );
}
