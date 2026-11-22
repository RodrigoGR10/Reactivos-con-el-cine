import { Indicator, Drawer, Accordion } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useState, useRef, useId, useMemo } from "react";
import { useEsMovilFiltros } from "../../../hooks/useEsMovilFiltros";
import { CloseIcon, SlidersIcon } from "../Icons";
import { GrupoFiltrosContext } from "./GrupoFiltrosContext";
import type {
    GrupoFiltrosCtx,
    GrupoFiltrosProps,
    RegistroFiltroGrupo,
} from "./types";

/**
 * Agrupa filtros: en móvil permite confirmar o cancelar sus cambios en un panel.
 * @param cantidadActivos Número de filtros seleccionados para el indicador.
 * @param disabled Si es `true`, deshabilita el grupo completo.
 * @param children Selectores que forman el grupo.
 * @returns Elemento de interfaz que representa el componente con las propiedades recibidas.
 */
export function GrupoFiltros({
    cantidadActivos,
    disabled = false,
    children,
}: GrupoFiltrosProps) {
    const esMovil = useEsMovilFiltros();
    const [abierto, { open, close }] = useDisclosure(false);
    const [sesion, setSesion] = useState(0);
    const [conteos, setConteos] = useState<Record<string, number>>({});
    const handlersRef = useRef(new Map<string, RegistroFiltroGrupo>());
    const panelId = useId();
    const tituloId = useId();

    const ctx = useMemo<GrupoFiltrosCtx>(
        () => ({
            registrar: (id, handler) => {
                handlersRef.current.set(id, handler);
                return () => {
                    handlersRef.current.delete(id);
                };
            },
            actualizarConteo: (id, cantidad) => {
                setConteos((prev) =>
                    prev[id] === cantidad ? prev : { ...prev, [id]: cantidad },
                );
            },
        }),
        [],
    );

    if (!esMovil) {
        return <>{children}</>;
    }

    const totalBorrador = Object.values(conteos).reduce((sum, n) => sum + n, 0);

    const abrirDrawer = () => {
        setConteos({});
        setSesion((n) => n + 1);
        open();
    };

    const limpiarBorradores = () => {
        for (const handler of handlersRef.current.values()) {
            handler.clear();
        }
        setConteos({});
    };

    const aplicar = () => {
        for (const handler of handlersRef.current.values()) {
            handler.commit();
        }
        close();
    };

    return (
        <>
            <Indicator
                label={cantidadActivos}
                size={18}
                offset={4}
                color="var(--color-acento)"
                disabled={cantidadActivos === 0}
            >
                <button
                    type="button"
                    className={`cines-comunas-trigger filtros-movil-trigger ${cantidadActivos > 0 ? "activo" : ""}`.trim()}
                    aria-label={
                        cantidadActivos > 0
                            ? `Filtros (${cantidadActivos} activos)`
                            : "Abrir filtros"
                    }
                    aria-expanded={abierto}
                    aria-controls={abierto ? panelId : undefined}
                    disabled={disabled}
                    onClick={abrirDrawer}
                >
                    <SlidersIcon size={18} />
                </button>
            </Indicator>

            <Drawer.Root
                opened={abierto}
                onClose={close}
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
                            "cines-comunas-panel cines-comunas-panel--drawer filtros-movil-drawer",
                    }}
                    aria-labelledby={tituloId}
                >
                    <div className="cines-comunas-panel-header">
                        <strong id={tituloId}>Filtros</strong>
                        <button
                            type="button"
                            className="cines-icon-button"
                            onClick={close}
                            aria-label="Cerrar filtros"
                        >
                            <CloseIcon size={16} />
                        </button>
                    </div>
                    <div className="filtros-movil-accordion-scroll">
                        <GrupoFiltrosContext.Provider value={ctx}>
                            <Accordion
                                key={sesion}
                                variant="separated"
                                radius="md"
                                className="filtros-movil-accordion"
                            >
                                {children}
                            </Accordion>
                        </GrupoFiltrosContext.Provider>
                    </div>
                    <div className="cines-comunas-panel-footer">
                        {totalBorrador > 0 && (
                            <button
                                type="button"
                                className="cines-comunas-limpiar"
                                onClick={limpiarBorradores}
                            >
                                Quitar selección
                            </button>
                        )}
                        <button
                            type="button"
                            className="cines-comunas-listo"
                            onClick={aplicar}
                        >
                            Listo
                        </button>
                    </div>
                </Drawer.Content>
            </Drawer.Root>
        </>
    );
}
