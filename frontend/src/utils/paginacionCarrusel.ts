/**
 * Estima cuántas tarjetas de preventa caben en el ancho disponible.
 * @param anchoDisponible Ancho útil del carrusel en píxeles.
 * @param esMovil Si es `true`, usa el ancho reducido de tarjetas móviles.
 * @returns Número mínimo de tarjetas que se muestran en la página.
 */
export function tarjetasPreventaVisibles(
    anchoDisponible: number,
    esMovil: boolean,
) {
    const vw =
        typeof window !== "undefined" ? window.innerWidth : anchoDisponible;
    const anchoMinimo = esMovil ? 150 : Math.min(360, Math.max(230, vw * 0.16));
    const separacion = esMovil ? 16 : Math.min(36, Math.max(24, vw * 0.017));
    return Math.max(
        1,
        Math.floor((anchoDisponible + separacion) / (anchoMinimo + separacion)),
    );
}

/**
 * Limita una página solicitada y calcula el rango de tarjetas que muestra.
 * @param total Número total de elementos.
 * @param visibles Elementos que caben en una página.
 * @param solicitada Índice de página pedido, comenzando en cero.
 * @returns Página válida, posición inicial y extremos visibles (comienzan en uno).
 */
export function paginacionCarrusel(
    total: number,
    visibles: number,
    solicitada: number,
) {
    const capacidad = Math.max(1, Math.trunc(visibles));
    const ultimaPagina = Math.max(0, Math.ceil(total / capacidad) - 1);
    const pagina = Math.max(0, Math.min(ultimaPagina, Math.trunc(solicitada)));
    const posicion = Math.min(
        pagina * capacidad,
        Math.max(0, total - capacidad),
    );
    return {
        pagina,
        ultimaPagina,
        posicion,
        desde: total > 0 ? posicion + 1 : 0,
        hasta: Math.min(total, posicion + capacidad),
    };
}
