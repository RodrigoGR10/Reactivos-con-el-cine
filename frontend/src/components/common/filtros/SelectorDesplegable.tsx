import { Drawer, Popover } from "@mantine/core";
import { useEsMovilFiltros } from "../../../hooks/useEsMovilFiltros";
import { useId } from "react";
import type { SelectorDesplegableProps } from "./types";
import { CloseIcon } from "../Icons";

/**
 * Contenedor desplegable compartido para selectores simples y múltiples.
 * Usa Popover (Floating UI + Portal) en desktop y Drawer inferior en móvil.
 */
export function SelectorDesplegable({
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
                    <Drawer.Overlay
                        color="#000"
                        backgroundOpacity={0.48}
                        blur={3}
                    />
                    <Drawer.Content
                        id={panelId}
                        classNames={{
                            content:
                                "cines-comunas-panel cines-comunas-panel--drawer",
                        }}
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
                middlewares={{
                    flip: true,
                    shift: { padding: 12 },
                    size: { padding: 12 },
                }}
                returnFocus
                transitionProps={{
                    transition: "fade",
                    duration: 150,
                    exitDuration: 110,
                }}
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
