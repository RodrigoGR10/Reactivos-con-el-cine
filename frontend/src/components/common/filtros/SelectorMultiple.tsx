import { useDisclosure } from "@mantine/hooks";
import { useContext, useId, useState, useRef, useEffect } from "react";
import { mismasSeleccionadas, filtrarOpcionesPorBusqueda } from "./constants";
import { PanelOpcionesMultiple } from "./PanelOpcionesMultiples";
import { SeccionAcordeon } from "./SeccionAcordeon";
import { SelectorDesplegable } from "./SelectorDesplegable";
import { GrupoFiltrosContext } from "./GrupoFiltrosContext";
import type { SelectorMultipleProps } from "./types";

/**
 * Selector múltiple desplegable con casillas, conteo por opción y búsqueda opcional.
 */
export function SelectorMultiple({
  opciones,
  seleccionadas,
  onChange,
  titulo,
  etiquetaTodas,
  etiquetaPlural,
  etiquetaSingular = `1 ${etiquetaPlural.replace(/s$/, "")}`,
  ariaLabelPrefijo,
  conBusqueda = false,
  placeholderBusqueda = "Buscar...",
  mensajeVacio = "No se encontraron opciones.",
  posicion = "bottom-end",
  className = "",
  disabled = false,
}: SelectorMultipleProps) {
  const grupo = useContext(GrupoFiltrosContext);
  const filtroId = useId();
  const [busqueda, setBusqueda] = useState("");
  const [borrador, setBorrador] = useState<string[]>(seleccionadas);
  const buscador = useRef<HTMLInputElement>(null);
  const [abierto, { close, toggle }] = useDisclosure(false);

  const estadoRef = useRef({ borrador, seleccionadas, onChange });
  useEffect(() => {
    estadoRef.current = { borrador, seleccionadas, onChange };
  }, [borrador, seleccionadas, onChange]);

  useEffect(() => {
    if (!grupo) return;
    grupo.actualizarConteo(filtroId, estadoRef.current.borrador.length);
    return grupo.registrar(filtroId, {
      commit: () => {
        const {
          borrador: draft,
          seleccionadas: actuales,
          onChange: aplicar,
        } = estadoRef.current;
        if (!mismasSeleccionadas(draft, actuales)) {
          aplicar(draft);
        }
      },
      clear: () => {
        estadoRef.current = { ...estadoRef.current, borrador: [] };
        setBorrador([]);
      },
    });
  }, [grupo, filtroId]);

  const activa = grupo ? borrador : seleccionadas;
  const etiqueta =
    activa.length === 1
      ? (opciones.find((opcion) => opcion.valor === activa[0])?.nombre ??
        etiquetaSingular)
      : activa.length
        ? `${activa.length} ${etiquetaPlural}`
        : etiquetaTodas;

  const visibles = filtrarOpcionesPorBusqueda(opciones, busqueda);

  const actualizarLista = (lista: string[], valor: string, marcada: boolean) =>
    marcada
      ? lista.includes(valor)
        ? lista
        : [...lista, valor]
      : lista.filter((item) => item !== valor);

  if (grupo) {
    return (
      <SeccionAcordeon
        titulo={titulo}
        etiquetaActiva={borrador.length > 0 ? etiqueta : undefined}
        disabled={disabled}
      >
        <PanelOpcionesMultiple
          conBusqueda={conBusqueda}
          buscadorRef={buscador}
          autoFocusBusqueda={false}
          busqueda={busqueda}
          onBusquedaChange={setBusqueda}
          placeholderBusqueda={placeholderBusqueda}
          visibles={visibles}
          seleccionadas={borrador}
          onAlternar={(valor, marcada) => {
            const siguiente = actualizarLista(borrador, valor, marcada);
            setBorrador(siguiente);
            grupo.actualizarConteo(filtroId, siguiente.length);
          }}
          mensajeVacio={mensajeVacio}
        />
      </SeccionAcordeon>
    );
  }

  return (
    <SelectorDesplegable
      abierto={abierto}
      onAlternar={toggle}
      onCerrar={close}
      focusAlAbrirRef={conBusqueda ? buscador : undefined}
      posicion={posicion}
      titulo={titulo}
      etiqueta={etiqueta}
      ariaLabel={`${ariaLabelPrefijo}: ${etiqueta}`}
      tieneSeleccion={seleccionadas.length > 0}
      cerrarLabel={`Cerrar selector de ${etiquetaPlural}`}
      className={className}
      disabled={disabled}
      onAbrir={() => {
        setBusqueda("");
        setBorrador(seleccionadas);
      }}
    >
      <PanelOpcionesMultiple
        conBusqueda={conBusqueda}
        buscadorRef={buscador}
        busqueda={busqueda}
        onBusquedaChange={setBusqueda}
        placeholderBusqueda={placeholderBusqueda}
        visibles={visibles}
        seleccionadas={borrador}
        onAlternar={(valor, marcada) =>
          setBorrador((prev) => actualizarLista(prev, valor, marcada))
        }
        mensajeVacio={mensajeVacio}
      />
      <div className="cines-comunas-panel-footer">
        {borrador.length > 0 && (
          <button
            type="button"
            className="cines-comunas-limpiar"
            onClick={() => {
              setBorrador([]);
              if (seleccionadas.length > 0) onChange([]);
            }}
          >
            Quitar selección
          </button>
        )}
        <button
          type="button"
          className="cines-comunas-listo"
          onClick={() => {
            if (!mismasSeleccionadas(borrador, seleccionadas))
              onChange(borrador);
            close();
          }}
        >
          Listo
        </button>
      </div>
    </SelectorDesplegable>
  );
}
