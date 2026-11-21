import { useDisclosure } from "@mantine/hooks";
import { useContext, useId, useState, useRef, useEffect } from "react";
import { filtrarOpcionesPorBusqueda } from "./constants";
import { GrupoFiltrosContext } from "./GrupoFiltrosContext";
import { ListaOpcionesUnico } from "./ListaOpcionesUnico";
import { SeccionAcordeon } from "./SeccionAcordeon";
import { SelectorDesplegable } from "./SelectorDesplegable";
import type { SelectorUnicoProps } from "./types";

export function SelectorUnico({
    opciones,
    seleccionada,
    onChange,
    titulo,
    etiquetaVacia,
    ariaLabelPrefijo,
    cerrarLabel = `Cerrar selector de ${titulo.toLowerCase()}`,
    posicion = "bottom-end",
    className = "",
    disabled = false,
    conBusqueda = false,
    placeholderBusqueda = "Buscar...",
    mensajeVacio = "No se encontraron opciones.",
    mostrarCantidad = true,
    deseleccionable = true,
}: SelectorUnicoProps) {
    const grupo = useContext(GrupoFiltrosContext);
    const filtroId = useId();
    const [busqueda, setBusqueda] = useState("");
    const [borrador, setBorrador] = useState(seleccionada);
    const buscador = useRef<HTMLInputElement>(null);
    const [abierto, { close, toggle }] = useDisclosure(false);

    const estadoRef = useRef({
        borrador,
        seleccionada,
        onChange,
        deseleccionable,
    });
    useEffect(() => {
        estadoRef.current = {
            borrador,
            seleccionada,
            onChange,
            deseleccionable,
        };
    }, [borrador, seleccionada, onChange, deseleccionable]);

    useEffect(() => {
        if (!grupo) return;
        grupo.actualizarConteo(filtroId, estadoRef.current.borrador ? 1 : 0);
        return grupo.registrar(filtroId, {
            commit: () => {
                const {
                    borrador: draft,
                    seleccionada: actual,
                    onChange: aplicar,
                } = estadoRef.current;
                if (draft !== actual) {
                    aplicar(draft);
                }
            },
            clear: () => {
                if (!estadoRef.current.deseleccionable) return;
                estadoRef.current = { ...estadoRef.current, borrador: "" };
                setBorrador("");
            },
        });
    }, [grupo, filtroId]);

    const activa = grupo ? borrador : seleccionada;
    const etiqueta =
        opciones.find((opcion) => opcion.valor === activa)?.nombre ??
        etiquetaVacia;
    const visibles = conBusqueda
        ? filtrarOpcionesPorBusqueda(opciones, busqueda)
        : opciones;

    if (grupo) {
        return (
            <SeccionAcordeon
                titulo={titulo}
                etiquetaActiva={borrador ? etiqueta : undefined}
                disabled={disabled}
            >
                <ListaOpcionesUnico
                    titulo={titulo}
                    opciones={visibles}
                    seleccionada={borrador}
                    onElegir={(siguiente) => {
                        setBorrador(siguiente);
                        grupo.actualizarConteo(filtroId, siguiente ? 1 : 0);
                    }}
                    conBusqueda={conBusqueda}
                    buscadorRef={buscador}
                    autoFocusBusqueda={false}
                    busqueda={busqueda}
                    onBusquedaChange={setBusqueda}
                    placeholderBusqueda={placeholderBusqueda}
                    mensajeVacio={mensajeVacio}
                    mostrarCantidad={mostrarCantidad}
                    deseleccionable={deseleccionable}
                />
            </SeccionAcordeon>
        );
    }

    return (
        <SelectorDesplegable
            abierto={abierto}
            onAbrir={() => setBusqueda("")}
            onAlternar={toggle}
            onCerrar={close}
            focusAlAbrirRef={conBusqueda ? buscador : undefined}
            posicion={posicion}
            titulo={titulo}
            etiqueta={etiqueta}
            ariaLabel={`${ariaLabelPrefijo}: ${etiqueta}`}
            tieneSeleccion={Boolean(seleccionada)}
            cerrarLabel={cerrarLabel}
            className={className}
            disabled={disabled}
        >
            <ListaOpcionesUnico
                titulo={titulo}
                opciones={visibles}
                seleccionada={seleccionada}
                onElegir={(valor) => {
                    if (valor !== seleccionada) onChange(valor);
                    setBusqueda("");
                    close();
                }}
                conBusqueda={conBusqueda}
                buscadorRef={buscador}
                busqueda={busqueda}
                onBusquedaChange={setBusqueda}
                placeholderBusqueda={placeholderBusqueda}
                mensajeVacio={mensajeVacio}
                mostrarCantidad={mostrarCantidad}
                deseleccionable={deseleccionable}
            />
            {deseleccionable && Boolean(seleccionada) && (
                <div className="cines-comunas-panel-footer">
                    <button
                        type="button"
                        className="cines-comunas-limpiar"
                        onClick={() => {
                            onChange("");
                            setBusqueda("");
                            close();
                        }}
                    >
                        Quitar selección
                    </button>
                </div>
            )}
        </SelectorDesplegable>
    );
}
