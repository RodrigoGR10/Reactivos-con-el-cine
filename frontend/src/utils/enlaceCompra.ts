const cadenas: Record<string, { nombre: string; dominios: string[] }> = {
    cinemark: {
        nombre: "Cinemark",
        dominios: ["www.cinemark.cl", "cinemark.cl"],
    },
    cineplanet: {
        nombre: "Cineplanet",
        dominios: ["www.cineplanet.cl", "cineplanet.cl"],
    },
    muvix: { nombre: "Muvix", dominios: ["muvix.cl", "www.muvix.cl"] },
    cinestar: {
        nombre: "Cinestar",
        dominios: ["cinestar.cl", "www.cinestar.cl"],
    },
    cinepolis: {
        nombre: "Cinépolis",
        dominios: [
            "cinepolis.cl",
            "www.cinepolis.cl",
            "hoyts.cl",
            "www.hoyts.cl",
            "cinepolis.com",
            "www.cinepolis.com",
            "compra.cinepolis.com",
        ],
    },
};

/**
 * Comprueba protocolo y dominio antes de habilitar un enlace de compra.
 * @param value URL entregada por la fuente del cine.
 * @param origen Clave de la cadena que debe ser dueña del dominio.
 * @returns URL HTTPS normalizada o `undefined` si no es segura o válida.
 */
export function obtenerEnlaceCompraSeguro(
    value: string | null | undefined,
    origen: string | undefined,
): string | undefined {
    if (!value) return undefined;
    try {
        const url = new URL(value);
        if (url.protocol !== "https:" || url.username || url.password)
            return undefined;
        const dominios = cadenas[origen ?? ""]?.dominios;
        if (dominios && !dominios.includes(url.hostname)) return undefined;
        return url.href;
    } catch {
        return undefined;
    }
}

/**
 * Resuelve el nombre visible de la cadena de cine.
 * @param origen Clave de origen de la función.
 * @param alternativa Texto usado si no se reconoce el origen.
 * @returns Nombre de la cadena o alternativa indicada.
 */
export function nombreCadena(
    origen: string | undefined,
    alternativa = "Cine",
): string {
    return cadenas[origen ?? ""]?.nombre ?? alternativa;
}
