// Unifica los nombres de comuna que entregan los scrapers con la lista oficial.

import { COMUNAS, VARIANTES } from "./comunasDatos.ts";

export { COMUNAS } from "./comunasDatos.ts";

// Palabras que van en minúscula salvo al inicio (solo para valores que no son comunas oficiales)
const MINUSCULAS = new Set(["de", "del", "la", "las", "los", "lo", "y", "e"]);

/**
 * Genera una clave comparable para el nombre de una comuna.
 * @param texto Texto que se analiza o transforma.
 * @returns Texto normalizado o generado por la operación.
 */
export function claveComuna(texto: string): string {
    return texto
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[’‘`´]/g, "'")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}

const POR_CLAVE = new Map(
    COMUNAS.map((comuna) => [claveComuna(comuna), comuna]),
);

/**
 * Comprueba si el nombre corresponde a una comuna oficial de Chile.
 * @param valor Texto que se normaliza o valida.
 * @returns Resultado que indica si se cumple la condición evaluada.
 */
export function esComunaOficial(valor: string): boolean {
    return POR_CLAVE.has(claveComuna(valor));
}

function capitalizar(nombre: string): string {
    return nombre
        .toLocaleLowerCase("es-CL")
        .split(" ")
        .map((palabra, i) =>
            i > 0 && MINUSCULAS.has(claveComuna(palabra))
                ? palabra
                : palabra.charAt(0).toLocaleUpperCase("es-CL") +
                  palabra.slice(1),
        )
        .join(" ");
}

// "LOS ANDES" -> "Los Andes", "VINA DEL MAR" -> "Viña del Mar"
/**
 * Convierte una variante escrita de comuna a su nombre oficial.
 * @param valor Texto que se normaliza o valida.
 * @returns Texto normalizado o generado por la operación.
 */
export function normalizarComuna(valor: string): string {
    if (typeof valor !== "string") return valor;

    const limpio = valor.replace(/\s+/g, " ").trim();
    if (!limpio) return limpio;

    const clave = claveComuna(limpio);
    return POR_CLAVE.get(clave) ?? VARIANTES[clave] ?? capitalizar(limpio);
}
