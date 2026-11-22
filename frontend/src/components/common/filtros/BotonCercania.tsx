import { Tooltip, Loader } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { MapPinIcon } from "../Icons";
import { TOOLTIP_EVENTS_DESKTOP } from "./constants";
import type { BotonCercaniaProps } from "./types";

/**
 * Activa o desactiva el orden por distancia a la ubicación de la persona.
 * @param activo Estado actual del filtro de cercanía.
 * @param cargando Indica que se está solicitando la ubicación.
 * @param onToggle Callback para cambiar el estado.
 * @param tituloInactivo Etiqueta accesible cuando el filtro está apagado.
 * @param tituloActivo Etiqueta accesible cuando el filtro está encendido.
 * @param compacto Si es `true`, reduce la presentación del botón.
 * @param className Clase CSS adicional.
 * @returns Elemento de interfaz que representa el componente con las propiedades recibidas.
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
        useMediaQuery("(max-width: 600px), (hover: none), (pointer: coarse)") ??
        false;
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
                {!compacto && (
                    <span>{cargando ? "Ubicando..." : "Cerca de mí"}</span>
                )}
            </button>
        </Tooltip>
    );
}
