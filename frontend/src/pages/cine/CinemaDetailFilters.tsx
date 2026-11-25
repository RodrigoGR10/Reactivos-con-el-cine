import {
    ChipsFiltrosActivos,
    GrupoFiltros,
    SelectorUnico,
} from "../../components/common/SelectorMultiple";
import { SelectorFechas } from "../../components/funciones/SelectorFechas";
import BuscadorPeliculas from "../../components/peliculas/BuscadorPeliculas";
import type { useCinemaScheduleFilters } from "../../hooks/useCinemaScheduleFilters";

interface CinemaDetailFiltersProps {
    filtros: ReturnType<typeof useCinemaScheduleFilters>;
    totalHorarios: number;
}

/**
 * Presenta los filtros disponibles para la cartelera de un cine.
 * @param filtros Estado y acciones producidos por `useCinemaScheduleFilters`.
 * @param totalHorarios Cantidad inicial de horarios disponibles.
 * @returns Elemento de interfaz que representa el componente con las propiedades recibidas.
 */
export function CinemaDetailFilters({
    filtros,
    totalHorarios,
}: CinemaDetailFiltersProps) {
    const {
        fechasDisponibles,
        fechaActual,
        seleccionarFecha,
        busqueda,
        setBusqueda,
        opcionesFormato,
        formatoActual,
        setFormatoSeleccionado,
        opcionesIdioma,
        idiomaActual,
        setIdiomaSeleccionado,
        hayFiltrosDesplegables,
        chipsFiltros,
        esMovil,
    } = filtros;

    return (
        <>
            <SelectorFechas
                fechas={fechasDisponibles}
                fechaSeleccionada={fechaActual}
                onSeleccionarFecha={seleccionarFecha}
            />

            {totalHorarios > 0 && (
                <div className="cartelera-cine-filtros">
                    <div
                        className={`herramientas-cartelera ${esMovil && hayFiltrosDesplegables ? "herramientas-cartelera--movil" : ""}`.trim()}
                    >
                        <BuscadorPeliculas
                            busqueda={busqueda}
                            onBusquedaChange={setBusqueda}
                            label="Buscar películas"
                            placeholder="Buscar películas..."
                        />
                        {hayFiltrosDesplegables && (
                            <div className="filtros-cartelera-selectores">
                                <GrupoFiltros
                                    cantidadActivos={chipsFiltros.length}
                                >
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
                                    {opcionesIdioma.length > 1 && (
                                        <SelectorUnico
                                            className="filtro-idioma"
                                            opciones={opcionesIdioma}
                                            seleccionada={
                                                idiomaActual === "Todos"
                                                    ? ""
                                                    : idiomaActual
                                            }
                                            onChange={(valor) =>
                                                setIdiomaSeleccionado(
                                                    valor || "Todos",
                                                )
                                            }
                                            titulo="Idioma"
                                            etiquetaVacia="Idioma"
                                            ariaLabelPrefijo="Filtrar por idioma"
                                        />
                                    )}
                                </GrupoFiltros>
                            </div>
                        )}
                    </div>
                    <ChipsFiltrosActivos chips={chipsFiltros} />
                </div>
            )}
        </>
    );
}
