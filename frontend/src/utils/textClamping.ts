const SINOPSIS_LINEAS_POR_DEFECTO = 5;
const FACTOR_INTERLINEADO_SINOPSIS = 1.65;

/** Alto de un elemento incluyendo sus márgenes verticales. */
export function altoExterior(elemento: Element): number {
    const estilo = window.getComputedStyle(elemento);
    if (estilo.display === "none") return 0;
    const margenTop = parseFloat(estilo.marginTop) || 0;
    const margenBottom = parseFloat(estilo.marginBottom) || 0;
    return elemento.getBoundingClientRect().height + margenTop + margenBottom;
}

/**
 * Calcula cuántas líneas de texto caben en el espacio que deja el contenedor
 * después de descontar padding, márgenes del párrafo y el resto de sus hijos.
 */
export function calcularLineasDisponibles(
    contenedorEl: HTMLElement,
    contenidoEl: HTMLElement,
    parrafoEl: HTMLElement,
): { lineas: number; alturaLinea: number } {
    const estiloContenido = window.getComputedStyle(contenidoEl);
    const paddingVertical =
        (parseFloat(estiloContenido.paddingTop) || 0) +
        (parseFloat(estiloContenido.paddingBottom) || 0);

    let alturaOtrosElementos = 0;
    for (const hijo of contenidoEl.children) {
        if (hijo !== parrafoEl) {
            alturaOtrosElementos += altoExterior(hijo);
        }
    }

    const estiloParrafo = window.getComputedStyle(parrafoEl);
    const fontSize = parseFloat(estiloParrafo.fontSize) || 16;
    const rawLineHeight = parseFloat(estiloParrafo.lineHeight);
    const alturaLinea =
        Number.isFinite(rawLineHeight) && rawLineHeight > 0
            ? rawLineHeight
            : fontSize * FACTOR_INTERLINEADO_SINOPSIS;
    const margenParrafo =
        (parseFloat(estiloParrafo.marginTop) || 0) +
        (parseFloat(estiloParrafo.marginBottom) || 0);

    const maxLineasCss =
        parseInt(
            estiloContenido.getPropertyValue("--sinopsis-lineas-max"),
            10,
        ) || SINOPSIS_LINEAS_POR_DEFECTO;

    const espacioDisponible =
        contenedorEl.clientHeight -
        paddingVertical -
        alturaOtrosElementos -
        margenParrafo;
    const lineasDisponibles = Math.floor((espacioDisponible + 1) / alturaLinea);
    return {
        lineas: Math.max(0, Math.min(maxLineasCss, lineasDisponibles)),
        alturaLinea,
    };
}

/** Une las primeras palabras y cierra con puntos suspensivos. */
export function formatearPrefijoPalabras(
    palabras: readonly string[],
    cantidad: number,
): string {
    const base = palabras
        .slice(0, cantidad)
        .join(" ")
        .replace(/[.,;:!?¿¡—–-]+$/, "");
    return `${base}...`;
}

/**
 * Ajusta el texto del párrafo al alto de las líneas disponibles, buscando por
 * bisección la mayor cantidad de palabras que quepa sin desbordar.
 */
export function ajustarTextoPorPalabras(
    parrafoEl: HTMLElement,
    textoCompleto: string,
    lineas: number,
    alturaLinea: number,
): void {
    parrafoEl.dataset.sinopsisMidiendo = "true";
    parrafoEl.textContent = textoCompleto;

    const alturaMax = lineas * alturaLinea + Math.max(2, alturaLinea * 0.25);
    if (parrafoEl.getBoundingClientRect().height <= alturaMax) {
        delete parrafoEl.dataset.sinopsisMidiendo;
        return;
    }

    const palabras = textoCompleto.trim().split(/\s+/).filter(Boolean);
    let lo = 1;
    let hi = palabras.length - 1;
    let mejor = 0;

    while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        parrafoEl.textContent = formatearPrefijoPalabras(palabras, mid);
        if (parrafoEl.getBoundingClientRect().height <= alturaMax) {
            mejor = mid;
            lo = mid + 1;
        } else {
            hi = mid - 1;
        }
    }

    parrafoEl.textContent =
        mejor > 0 ? formatearPrefijoPalabras(palabras, mejor) : textoCompleto;
    delete parrafoEl.dataset.sinopsisMidiendo;
}
