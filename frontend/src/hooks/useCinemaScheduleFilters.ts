import { useMemo, useState } from "react";
import type { Horario, Pelicula } from "../types/types";
import {
    agruparHorariosPorPelicula,
    horarioCoincideIdioma,
    obtenerFormatosDisponibles,
    obtenerIdiomasDisponibles,
} from "../utils/agruparFunciones";
import { normalizarTexto } from "../utils/normalizarTexto";
import { useFavoritosAlEntrar } from "./useFavoritosAlEntrar";
import { useEsMovilFiltros } from "./useEsMovilFiltros";
import type { ChipFiltroActivo } from "../components/common/SelectorMultiple";

const TODOS = "Todos";

/**
 * Estado y derivaciones de los filtros de la cartelera de un cine:
 * fecha, formato, idioma y búsqueda por título.
 */

/**
 * Mantiene los filtros de la cartelera de un cine y calcula los grupos visibles.
 * @param horarios Funciones disponibles para el cine.
 * @param peliculas Catálogo usado para resolver los títulos de cada función.
 * @returns Fechas, opciones de filtro, selecciones actuales y grupos filtrados.
 */
export function useCinemaScheduleFilters(
    horarios: Horario[],
    peliculas: Pelicula[],
) {
    const [fechaSeleccionada, setFechaSeleccionada] = useState("");
    const [formatoSeleccionado, setFormatoSeleccionado] = useState(TODOS);
    const [idiomaSeleccionado, setIdiomaSeleccionado] = useState(TODOS);
    const [busqueda, setBusqueda] = useState("");
    const esMovil = useEsMovilFiltros();
    const { peliculasFavoritasAlEntrar } = useFavoritosAlEntrar();

    // 1. Fechas disponibles
    const fechasDisponibles = useMemo(
        () => [...new Set(horarios.map((h) => h.fecha).filter(Boolean))].sort(),
        [horarios],
    );
    const fechaActual = fechasDisponibles.includes(fechaSeleccionada)
        ? fechaSeleccionada
        : (fechasDisponibles[0] ?? "");

    const horariosDelDia = fechaActual
        ? horarios.filter((h) => h.fecha === fechaActual)
        : horarios;

    // 2. Formatos e idiomas del día seleccionado
    const opcionesFormato = obtenerFormatosDisponibles(horariosDelDia);
    const formatosDisponibles = [TODOS, ...opcionesFormato.map((f) => f.valor)];
    const formatoActual = formatosDisponibles.includes(formatoSeleccionado)
        ? formatoSeleccionado
        : TODOS;

    const opcionesIdioma = obtenerIdiomasDisponibles(horariosDelDia);
    const idiomasDisponibles = [TODOS, ...opcionesIdioma.map((i) => i.valor)];
    const idiomaActual = idiomasDisponibles.includes(idiomaSeleccionado)
        ? idiomaSeleccionado
        : TODOS;

    const hayFiltrosDesplegables =
        opcionesFormato.length > 1 || opcionesIdioma.length > 1;

    // 3. Horarios filtrados y agrupados por película
    const horariosFiltrados = horariosDelDia.filter(
        (h) =>
            (formatoActual === TODOS ||
                (h.formatoResumen || "2D") === formatoActual) &&
            horarioCoincideIdioma(h, idiomaActual),
    );

    const grupos = agruparHorariosPorPelicula(
        horariosFiltrados,
        peliculas,
    ).sort(
        (a, b) =>
            Number(peliculasFavoritasAlEntrar.has(b.pelicula.id)) -
            Number(peliculasFavoritasAlEntrar.has(a.pelicula.id)),
    );

    const terminoBusqueda = normalizarTexto(busqueda.trim());
    const gruposFiltrados = terminoBusqueda
        ? grupos.filter((g) =>
              normalizarTexto(g.pelicula.titulo).includes(terminoBusqueda),
          )
        : grupos;

    // 4. Chips de filtros activos
    const chipsFiltros: ChipFiltroActivo[] = [
        ...(formatoActual !== TODOS
            ? [
                  {
                      id: `formato-${formatoActual}`,
                      etiqueta: formatoActual,
                      ariaLabel: `Quitar filtro de formato: ${formatoActual}`,
                      onQuitar: () => setFormatoSeleccionado(TODOS),
                  },
              ]
            : []),
        ...(idiomaActual !== TODOS
            ? [
                  {
                      id: `idioma-${idiomaActual}`,
                      etiqueta: idiomaActual,
                      ariaLabel: `Quitar filtro de idioma: ${idiomaActual}`,
                      onQuitar: () => setIdiomaSeleccionado(TODOS),
                  },
              ]
            : []),
    ];

    // 5. Acciones
    const seleccionarFecha = (fecha: string) => {
        setFechaSeleccionada(fecha);
        setFormatoSeleccionado(TODOS);
        setIdiomaSeleccionado(TODOS);
    };

    const restablecerFiltros = () => {
        setBusqueda("");
        setFormatoSeleccionado(TODOS);
        setIdiomaSeleccionado(TODOS);
    };

    return {
        // Fechas
        fechasDisponibles,
        fechaActual,
        horariosDelDia,
        seleccionarFecha,
        // Formato e idioma
        opcionesFormato,
        formatoActual,
        setFormatoSeleccionado,
        opcionesIdioma,
        idiomaActual,
        setIdiomaSeleccionado,
        hayFiltrosDesplegables,
        // Búsqueda
        busqueda,
        setBusqueda,
        // Resultados
        grupos,
        gruposFiltrados,
        // Utilidades UI
        chipsFiltros,
        restablecerFiltros,
        esMovil,
    };
}
