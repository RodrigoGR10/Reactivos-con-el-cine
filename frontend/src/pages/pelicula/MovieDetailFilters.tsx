import { SelectorComunas } from "../../components/cines/SelectorComunas";
import {
    GrupoFiltros,
    SelectorMultiple,
    SelectorUnico,
    BotonCercania,
    ChipsFiltrosActivos,
} from "../../components/common/SelectorMultiple";
import SelectorFechas from "../../components/funciones/SelectorFechas";
import BuscadorPeliculas from "../../components/peliculas/BuscadorPeliculas";
import type { useMovieScheduleFilters } from "../../hooks/useMovieScheduleFilters";

interface MovieDetailFiltersProps {
    filtros: ReturnType<typeof useMovieScheduleFilters>;
    totalHorarios: number;
}

/**
 * Presenta los controles para filtrar funciones del detalle de película.
 * @param filtros Estado y acciones producidos por `useMovieScheduleFilters`.
 * @param totalHorarios Cantidad inicial de horarios disponibles.
 * @returns Elemento de interfaz que representa el componente con las propiedades recibidas.
 */
export function MovieDetailFilters({
    filtros,
    totalHorarios,
}: MovieDetailFiltersProps) {
    const {
        fechasDisponibles,
        fechaActual,
        seleccionarFecha,
        busqueda,
        setBusqueda,
        cadenasDisponibles,
        cadenasActivas,
        setCadenasSeleccionadas,
        comunasDisponibles,
        comunasActivas,
        setComunasSeleccionadas,
        opcionesFormato,
        formatoActual,
        setFormatoSeleccionado,
        grupos,
        ordenarPorCercania,
        alternarCercania,
        estadoUbicacion,
        chipsFiltros,
        esMovil,
    } = filtros;

    return (
        <>
            {/* Selector de fechas */}
            <SelectorFechas
                fechas={fechasDisponibles}
                fechaSeleccionada={fechaActual}
                onSeleccionarFecha={seleccionarFecha}
            />
            {/* Filtros de la cartelera */}
            {totalHorarios > 0 && (
                <div className="cartelera-cine-filtros">
                    <div
                        className={`herramientas-cartelera ${esMovil ? "herramientas-cartelera--movil" : ""}`.trim()}
                    >
                        <BuscadorPeliculas
                            busqueda={busqueda}
                            onBusquedaChange={setBusqueda}
                            label="Buscar cines"
                            placeholder="Buscar cines..."
                        />
                        <div className="filtros-cartelera-selectores">
                            <GrupoFiltros
                                cantidadActivos={chipsFiltros.length}
                                disabled={
                                    cadenasDisponibles.length === 0 &&
                                    comunasDisponibles.length === 0 &&
                                    opcionesFormato.length <= 1
                                }
                            >
                                <SelectorMultiple
                                    className="cines-cadenas-selector"
                                    posicion="bottom-start"
                                    opciones={cadenasDisponibles}
                                    seleccionadas={cadenasActivas}
                                    onChange={setCadenasSeleccionadas}
                                    titulo="Cadenas"
                                    etiquetaTodas="Cadenas"
                                    etiquetaPlural="cadenas"
                                    etiquetaSingular="1 cadena"
                                    ariaLabelPrefijo="Filtrar por cadenas"
                                    disabled={cadenasDisponibles.length === 0}
                                />

                                {comunasDisponibles.length > 0 && (
                                    <SelectorComunas
                                        opciones={comunasDisponibles}
                                        seleccionadas={comunasActivas}
                                        onChange={setComunasSeleccionadas}
                                    />
                                )}

                                {opcionesFormato.length > 1 && (
                                    <SelectorUnico
                                        className="filtro-formato"
                                        opciones={opcionesFormato}
                                        seleccionada={
                                            formatoActual === "Todos"
                                                ? ""
                                                : formatoActual
                                        }
                                        onChange={(valor) =>
                                            setFormatoSeleccionado(
                                                valor || "Todos",
                                            )
                                        }
                                        titulo="Formato"
                                        etiquetaVacia="Formato"
                                        ariaLabelPrefijo="Filtrar por formato"
                                    />
                                )}
                            </GrupoFiltros>

                            {grupos.length > 0 && (
                                <BotonCercania
                                    activo={ordenarPorCercania}
                                    cargando={estadoUbicacion === "cargando"}
                                    compacto={esMovil}
                                    tituloInactivo="Ordenar por cercanía"
                                    onToggle={alternarCercania}
                                />
                            )}
                        </div>
                    </div>
                    <ChipsFiltrosActivos
                        chips={chipsFiltros}
                        ariaLabel="Filtros seleccionados"
                    />
                </div>
            )}
        </>
    );
}
