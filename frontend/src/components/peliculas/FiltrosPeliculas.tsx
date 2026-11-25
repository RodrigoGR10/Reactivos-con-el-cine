import BuscadorPeliculas from "./BuscadorPeliculas.tsx";
import {
    ChipsFiltrosActivos,
    GrupoFiltros,
    SelectorMultiple,
    SelectorUnico,
    type ChipFiltroActivo,
    type OpcionFiltro,
} from "../common/SelectorMultiple";
import { useEsMovilFiltros } from "../../hooks/useEsMovilFiltros";
import "./FiltrosPeliculas.css";

interface FiltrosPeliculasProps {
    busqueda: string;
    onBusquedaChange: (nuevaBusqueda: string) => void;
    generos: OpcionFiltro[];
    clasificaciones: OpcionFiltro[];
    duraciones: OpcionFiltro[];
    generosSeleccionados: string[];
    clasificacionesSeleccionadas: string[];
    duracionSeleccionada: string;
    onGenerosChange: (generos: string[]) => void;
    onClasificacionesChange: (clasificaciones: string[]) => void;
    onDuracionChange: (duracion: string) => void;
}

/**
 * Dibuja búsqueda y filtros controlados de la cartelera.
 * @param props Valores, opciones y callbacks que mantiene la página principal.
 */
function FiltrosPeliculas({
    busqueda,
    onBusquedaChange,
    generos,
    clasificaciones,
    duraciones,
    generosSeleccionados,
    clasificacionesSeleccionadas,
    duracionSeleccionada,
    onGenerosChange,
    onClasificacionesChange,
    onDuracionChange,
}: FiltrosPeliculasProps) {
    const esMovil = useEsMovilFiltros();
    const duracionActiva = duraciones.find(
        (opcion) => opcion.valor === duracionSeleccionada,
    );

    const chips: ChipFiltroActivo[] = [
        ...generosSeleccionados.map((genero) => ({
            id: `genero-${genero}`,
            etiqueta: genero,
            ariaLabel: `Quitar filtro de género: ${genero}`,
            onQuitar: () =>
                onGenerosChange(
                    generosSeleccionados.filter((item) => item !== genero),
                ),
        })),
        ...clasificacionesSeleccionadas.map((clasificacion) => ({
            id: `clasificacion-${clasificacion}`,
            etiqueta: clasificacion,
            ariaLabel: `Quitar filtro de clasificación: ${clasificacion}`,
            onQuitar: () =>
                onClasificacionesChange(
                    clasificacionesSeleccionadas.filter(
                        (item) => item !== clasificacion,
                    ),
                ),
        })),
        ...(duracionActiva
            ? [
                  {
                      id: `duracion-${duracionActiva.valor}`,
                      etiqueta: duracionActiva.nombre,
                      ariaLabel: `Quitar filtro de duración: ${duracionActiva.nombre}`,
                      onQuitar: () => onDuracionChange(""),
                  },
              ]
            : []),
    ];

    return (
        <section
            className="panel-filtros filtros-cartelera"
            aria-label="Búsqueda y filtros de cartelera"
        >
            <div
                className={`herramientas-cartelera ${esMovil ? "herramientas-cartelera--movil" : ""}`.trim()}
            >
                <BuscadorPeliculas
                    id="busqueda-pelicula"
                    busqueda={busqueda}
                    onBusquedaChange={onBusquedaChange}
                />
                <div className="filtros-cartelera-selectores">
                    <GrupoFiltros cantidadActivos={chips.length}>
                        <SelectorMultiple
                            className="filtro-generos"
                            posicion="bottom-start"
                            opciones={generos}
                            seleccionadas={generosSeleccionados}
                            onChange={onGenerosChange}
                            titulo="Géneros"
                            etiquetaTodas="Géneros"
                            etiquetaPlural="géneros"
                            etiquetaSingular="1 género"
                            ariaLabelPrefijo="Filtrar por géneros"
                            conBusqueda={generos.length > 8}
                            placeholderBusqueda="Buscar género..."
                            mensajeVacio="No se encontraron géneros."
                            disabled={generos.length === 0}
                        />

                        <SelectorMultiple
                            className="filtro-clasificacion"
                            posicion="bottom-start"
                            opciones={clasificaciones}
                            seleccionadas={clasificacionesSeleccionadas}
                            onChange={onClasificacionesChange}
                            titulo="Clasificación"
                            etiquetaTodas="Clasificación"
                            etiquetaPlural="clasificaciones"
                            etiquetaSingular="1 clasificación"
                            ariaLabelPrefijo="Filtrar por clasificación"
                            disabled={clasificaciones.length === 0}
                        />

                        <SelectorUnico
                            className="filtro-duracion"
                            opciones={duraciones}
                            seleccionada={duracionSeleccionada}
                            onChange={onDuracionChange}
                            titulo="Duración"
                            etiquetaVacia="Duración"
                            ariaLabelPrefijo="Filtrar por duración"
                        />
                    </GrupoFiltros>
                </div>
            </div>
            <ChipsFiltrosActivos chips={chips} />
        </section>
    );
}

export default FiltrosPeliculas;
