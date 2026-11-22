import type { Pelicula } from "../../types/types.ts";
import { CATEGORIAS_PRIMER_SLIDE } from "./config.ts";
import type {
    PeliculaDestacadaSeleccionada,
    ReglaCupoCategoria,
} from "./types.ts";

/**
 * Limita el valor del generador aleatorio al intervalo [0, 1).
 * @param rng Generador aleatorio que devuelve un número.
 * @returns Valor válido para índices y probabilidades.
 */
export function rollSeguro(rng: () => number): number {
    const valor = rng();
    if (!Number.isFinite(valor) || valor <= 0) return 0;
    if (valor >= 1) return 1 - Number.EPSILON;
    return valor;
}

/**
 * Elige una opción con probabilidad proporcional a su peso positivo.
 * @param opciones Opciones con propiedad `pesoVariable`.
 * @param rng Generador de números aleatorios, inyectable para reproducir resultados.
 * @returns Opción seleccionada según sus pesos.
 */
export function elegirPonderada<T extends { pesoVariable: number }>(
    opciones: readonly T[],
    rng: () => number,
): T {
    const pesoTotal = opciones.reduce(
        (acc, item) => acc + Math.max(0, item.pesoVariable),
        0,
    );
    if (pesoTotal <= 0) {
        return opciones[Math.floor(rollSeguro(rng) * opciones.length)];
    }
    let umbral = rollSeguro(rng) * pesoTotal;
    for (const opcion of opciones) {
        umbral -= Math.max(0, opcion.pesoVariable);
        if (umbral < 0) return opcion;
    }
    return opciones[opciones.length - 1];
}

/**
 * Selecciona una película por ranking o por sorteo ponderado según la regla.
 * @param disponibles Películas no utilizadas de la categoría.
 * @param regla Estrategia y cupo configurados para la categoría.
 * @param rng Generador aleatorio usado por la estrategia aleatoria.
 * @returns Película seleccionada del conjunto disponible.
 */
export function elegirCandidata(
    disponibles: readonly Pelicula[],
    regla: ReglaCupoCategoria,
    rng: () => number,
): Pelicula {
    if (regla.estrategia === "top" || disponibles.length === 1) {
        return disponibles[0];
    }
    const tope =
        regla.topAleatorio && regla.topAleatorio > 0
            ? Math.min(regla.topAleatorio, disponibles.length)
            : disponibles.length;
    const candidatasPonderadas = disponibles
        .slice(0, tope)
        .map((pelicula, idx) => ({
            pelicula,
            pesoVariable: tope - idx,
        }));
    return elegirPonderada(candidatasPonderadas, rng).pelicula;
}

/**
 * Mezcla el orden de destacadas y reserva una categoría prioritaria para el inicio.
 * @param items Películas con etiquetas y categorías ya seleccionadas.
 * @param rng Generador aleatorio para el orden reproducible.
 * @returns Lista mezclada con una categoría prioritaria en la primera posición.
 */
export function mezclarCarrusel(
    items: readonly PeliculaDestacadaSeleccionada[],
    rng: () => number,
): PeliculaDestacadaSeleccionada[] {
    const resultado = [...items];
    for (let i = resultado.length - 1; i > 0; i--) {
        const j = Math.floor(rollSeguro(rng) * (i + 1));
        const tmp = resultado[i];
        resultado[i] = resultado[j];
        resultado[j] = tmp;
    }

    // Reservamos el primer slide para favoritas, mas esperadas, mejor valoradas o tendencia en cines.
    if (
        resultado.length > 1 &&
        !CATEGORIAS_PRIMER_SLIDE.has(resultado[0].categoria)
    ) {
        const idxPrioritaria = resultado.findIndex((item) =>
            CATEGORIAS_PRIMER_SLIDE.has(item.categoria),
        );
        if (idxPrioritaria > 0) {
            const primera = resultado[0];
            resultado[0] = resultado[idxPrioritaria];
            resultado[idxPrioritaria] = primera;
        }
    }

    return resultado;
}
