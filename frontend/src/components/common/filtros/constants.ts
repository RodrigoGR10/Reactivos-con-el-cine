import { normalizarTexto } from "../../../utils/normalizarTexto";
import type { OpcionFiltro } from "./types";

export const TOOLTIP_EVENTS_DESKTOP = {
    hover: true,
    focus: true,
    touch: false,
} as const;

/** Indica si dos listas contienen los mismos valores seleccionados.
 * @param a Primer texto que se compara.
 * @param b Segundo texto que se compara.
 * @returns Valor booleano que indica si ambas selecciones contienen los mismos elementos.
 */
export const mismasSeleccionadas = (a: string[], b: string[]) =>
    a.length === b.length && a.every((valor) => b.includes(valor));

/**
 * Filtra por nombre o valor, ignorando mayúsculas y tildes.
 * @param opciones Opciones disponibles en el selector.
 * @param busqueda Texto ingresado por la persona.
 * @returns Opciones cuyo nombre o valor coincide con el texto.
 */
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

/**
 * Agrega o quita un valor sin mutar la lista de selección original.
 * @param lista Valores seleccionados antes del cambio.
 * @param valor Opción que se alterna.
 * @param marcada `true` para agregarla; `false` para quitarla.
 * @returns Nueva lista de valores seleccionados.
 */
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
