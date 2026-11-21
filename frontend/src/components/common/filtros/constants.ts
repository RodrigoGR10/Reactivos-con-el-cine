import { normalizarTexto } from "../../../utils/normalizarTexto";
import type { OpcionFiltro } from "./types";

export const TOOLTIP_EVENTS_DESKTOP = {
    hover: true,
    focus: true,
    touch: false,
} as const;

export const mismasSeleccionadas = (a: string[], b: string[]) =>
    a.length === b.length && a.every((valor) => b.includes(valor));

export const filtrarOpcionesPorBusqueda = (
    opciones: OpcionFiltro[],
    busqueda: string,
): OpcionFiltro[] => {
    const termino = normalizarTexto(busqueda.trim());
    if (!termino) return opciones;
    return opciones.filter(
        (opcion) =>
            normalizarTexto(opcion.nombre).includes(termino) ||
            normalizarTexto(opcion.valor).includes(termino),
    );
};

export const actualizarListaSeleccion = (
    lista: string[],
    valor: string,
    marcada: boolean,
) =>
    marcada
        ? lista.includes(valor)
            ? lista
            : [...lista, valor]
        : lista.filter((item) => item !== valor);
