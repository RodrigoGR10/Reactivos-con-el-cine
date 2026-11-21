import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useUbicacion } from "./useUbicacion";
import type { Horario, Cine } from "../types/types";
import { distanciaKM } from "../utils/distancia";
import { useFavoritosAlEntrar } from "./useFavoritosAlEntrar";
import { useEsMovilFiltros } from "./useEsMovilFiltros";
import { obtenerFormatosDisponibles } from "../utils/agruparFunciones";
import {
    filtrarCines,
    obtenerCadenas,
    obtenerComunas,
} from "../utils/agruparCines";
import type { ChipFiltroActivo } from "../components/common/SelectorMultiple";

const OPCIONES_ACTUALIZACION_FILTRO = {
    replace: true,
    preventScrollReset: true,
} as const;

export interface GrupoCineHorarios {
    cine: Cine;
    horarios: Horario[];
    distancia: number;
}

export function useMovieScheduleFilters(horarios: Horario[], cines: Cine[]) {
    const [searchParams, setSearchParams] = useSearchParams();
    const fechaSeleccionada = searchParams.get("fecha") ?? "";
    const cineSeleccionadoId = searchParams.get("cineId") ?? "";
    const { cinesFavoritosAlEntrar } = useFavoritosAlEntrar();
    const {
        ubicacion,
        estado: estadoUbicacion,
        solicitar,
        descartarAviso: descartarAvisoUbicacion,
    } = useUbicacion();
    const esMovil = useEsMovilFiltros();

    const [formatoSeleccionado, setFormatoSeleccionado] = useState("Todos");
    const [busqueda, setBusqueda] = useState("");
    const [comunasSeleccionadas, setComunasSeleccionadas] = useState<string[]>(
        [],
    );
    const [cadenasSeleccionadas, setCadenasSeleccionadas] = useState<string[]>(
        [],
    );
    const [cercaniaActiva, setCercaniaActiva] = useState(false);

    //1. Geolocalizacion y distancia
    const ordenarPorCercania =
        cercaniaActiva && estadoUbicacion === "listo" && ubicacion !== null;

    const distanciaA = (cine: Cine) =>
        ordenarPorCercania &&
        ubicacion &&
        cine.latitud != null &&
        cine.longitud != null
            ? distanciaKM(
                  ubicacion.latitud,
                  ubicacion.longitud,
                  cine.latitud,
                  cine.longitud,
              )
            : Infinity;

    const alternarCercania = () => {
        if (ordenarPorCercania) {
            setCercaniaActiva(false);
            return;
        }
        setCercaniaActiva(true);
        solicitar();
    };

    //2. Fechas
    const fechasDisponibles = [
        ...new Set(horarios.map((horario) => horario.fecha)),
    ].sort();

    const fechaActual = fechasDisponibles.includes(fechaSeleccionada)
        ? fechaSeleccionada
        : (fechasDisponibles[0] ?? "");
    const horariosDelDia = horarios.filter(
        (horario) => horario.fecha === fechaActual,
    );

    const seleccionarFecha = (fecha: string) => {
        setFormatoSeleccionado("Todos");
        setSearchParams((anteriores) => {
            const siguientes = new URLSearchParams(anteriores);
            siguientes.set("fecha", fecha);
            siguientes.delete("funcionId");
            siguientes.delete("hora");
            return siguientes;
        }, OPCIONES_ACTUALIZACION_FILTRO);
    };

    //3. Formatos
    const opcionesFormato = obtenerFormatosDisponibles(horariosDelDia);
    const formatosDisponibles = [
        "Todos",
        ...opcionesFormato.map((f) => f.valor),
    ];
    const formatoActual = formatosDisponibles.includes(formatoSeleccionado)
        ? formatoSeleccionado
        : "Todos";

    //4. Agrupacion y ordenamiento de cines
    const grupos = cines
        .flatMap((cine) => {
            const sesiones = horariosDelDia.filter(
                (h) =>
                    h.cineId === cine.id &&
                    (formatoActual === "Todos" ||
                        (h.formatoResumen || "2D") === formatoActual),
            );

            return sesiones.length
                ? [{ cine, horarios: sesiones, distancia: distanciaA(cine) }]
                : [];
        })
        .sort((a, b) => {
            const prioridad = ordenarPorCercania
                ? a.distancia === b.distancia
                    ? 0
                    : a.distancia - b.distancia
                : Number(cinesFavoritosAlEntrar.has(b.cine.id)) -
                  Number(cinesFavoritosAlEntrar.has(a.cine.id));
            return (
                prioridad ||
                a.cine.nombre.localeCompare(b.cine.nombre, "es-CL", {
                    sensitivity: "base",
                    numeric: true,
                }) ||
                a.cine.id.localeCompare(b.cine.id)
            );
        });

    //5. comunas y cadenas disponibles
    const cinesDelDia = cines.filter((cine) =>
        horariosDelDia.some((h) => h.cineId === cine.id),
    );
    const comunasDisponibles = obtenerComunas(cinesDelDia);
    const valoresComunasDisponibles = new Set(
        comunasDisponibles.map((c) => c.valor),
    );
    const comunasActivas = comunasSeleccionadas.filter((valor) =>
        valoresComunasDisponibles.has(valor),
    );

    const cadenasDisponibles = obtenerCadenas(grupos.map((g) => g.cine));
    const valoresCadenasDisponibles = new Set(
        cadenasDisponibles.map((c) => c.valor),
    );
    const cadenasActivas = cadenasSeleccionadas.filter((valor) =>
        valoresCadenasDisponibles.has(valor),
    );

    //6. cines filtrados finales
    const cinesFiltradosIds = new Set(
        filtrarCines(
            grupos.map((g) => g.cine),
            busqueda,
            comunasActivas,
            cadenasActivas,
        )
            .filter(
                (cine) => !cineSeleccionadoId || cine.id === cineSeleccionadoId,
            )
            .map((cine) => cine.id),
    );

    const gruposFiltrados = grupos.filter((g) =>
        cinesFiltradosIds.has(g.cine.id),
    );

    const cineSeleccionado = cines.find(
        (cine) => cine.id === cineSeleccionadoId,
    );

    //7. chips de filtros activos

    const chipsFiltros: ChipFiltroActivo[] = [
        ...(cineSeleccionado
            ? [
                  {
                      id: `cine-${cineSeleccionado.id}`,
                      etiqueta: cineSeleccionado.nombre,
                      ariaLabel: `Quitar filtro ${cineSeleccionado.nombre}`,
                      onQuitar: () =>
                          setSearchParams((anteriores) => {
                              const siguientes = new URLSearchParams(
                                  anteriores,
                              );
                              siguientes.delete("cineId");
                              siguientes.delete("funcionId");
                              siguientes.delete("hora");
                              return siguientes;
                          }, OPCIONES_ACTUALIZACION_FILTRO),
                  },
              ]
            : []),
        ...cadenasDisponibles
            .filter((cadena) => cadenasActivas.includes(cadena.valor))
            .map((cadena) => ({
                id: `cadena-${cadena.valor}`,
                etiqueta: cadena.nombre,
                ariaLabel: `Quitar filtro ${cadena.nombre}`,
                onQuitar: () =>
                    setCadenasSeleccionadas((anteriores) =>
                        anteriores.filter((valor) => valor !== cadena.valor),
                    ),
            })),
        ...comunasDisponibles
            .filter((comuna) => comunasActivas.includes(comuna.valor))
            .map((comuna) => ({
                id: `comuna-${comuna.valor}`,
                etiqueta: comuna.nombre,
                ariaLabel: `Quitar filtro ${comuna.nombre}`,
                onQuitar: () =>
                    setComunasSeleccionadas((anteriores) =>
                        anteriores.filter((valor) => valor !== comuna.valor),
                    ),
            })),
        ...(formatoActual !== "Todos"
            ? [
                  {
                      id: `formato-${formatoActual}`,
                      etiqueta: formatoActual,
                      ariaLabel: `Quitar filtro de formato: ${formatoActual}`,
                      onQuitar: () => setFormatoSeleccionado("Todos"),
                  },
              ]
            : []),
    ];

    //8. impiar todos los filtros
    const restablecerFiltros = () => {
        setBusqueda("");
        setComunasSeleccionadas([]);
        setFormatoSeleccionado("Todos");
        setCadenasSeleccionadas([]);
        setSearchParams((anteriores) => {
            const siguientes = new URLSearchParams(anteriores);
            siguientes.delete("cineId");
            siguientes.delete("funcionId");
            siguientes.delete("hora");
            return siguientes;
        }, OPCIONES_ACTUALIZACION_FILTRO);
    };
    return {
        // Fechas
        fechasDisponibles,
        fechaActual,
        seleccionarFecha,
        horariosDelDia,
        // Formato
        opcionesFormato,
        formatoActual,
        setFormatoSeleccionado,
        // Búsqueda
        busqueda,
        setBusqueda,
        // Cadenas y Comunas
        cadenasDisponibles,
        cadenasActivas,
        setCadenasSeleccionadas,
        comunasDisponibles,
        comunasActivas,
        setComunasSeleccionadas,
        // Resultados
        grupos,
        gruposFiltrados,
        // Geolocalización
        ordenarPorCercania,
        alternarCercania,
        estadoUbicacion,
        descartarAvisoUbicacion,
        // Utilidades UI
        chipsFiltros,
        restablecerFiltros,
        esMovil,
    };
}
