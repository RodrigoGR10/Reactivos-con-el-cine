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

export function nombreCadena(
    origen: string | undefined,
    alternativa = "Cine",
): string {
    return cadenas[origen ?? ""]?.nombre ?? alternativa;
}
