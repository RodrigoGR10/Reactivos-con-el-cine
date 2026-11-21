export type Trailer =
    | { tipo: "youtube"; id: string; url: string; embedUrl: string }
    | { tipo: "video"; url: string };

function construirEmbedUrlYoutube(id: string): string {
    const params = new URLSearchParams({ playsinline: "1", rel: "0" });
    if (typeof window !== "undefined" && window.location?.origin) {
        params.set("origin", window.location.origin);
    }
    return `https://www.youtube-nocookie.com/embed/${id}?${params}`;
}

export function obtenerTrailer(value?: string): Trailer | null {
    if (!value) return null;
    try {
        const url = new URL(value);
        if (
            url.protocol !== "https:" ||
            url.username ||
            url.password ||
            url.port
        )
            return null;
        if (
            ["www.youtube.com", "youtube.com"].includes(url.hostname) &&
            url.pathname === "/watch"
        ) {
            const id = url.searchParams.get("v");
            if (id && /^[A-Za-z0-9_-]{11}$/.test(id))
                return {
                    tipo: "youtube",
                    id,
                    url: `https://www.youtube.com/watch?v=${id}`,
                    embedUrl: construirEmbedUrlYoutube(id),
                };
        }
        if (
            url.hostname === "pimcore-content.cinepolis.com" &&
            /\.mp4$/i.test(url.pathname)
        )
            return { tipo: "video", url: url.href };
    } catch {
        /* No se incrustan direcciones desconocidas o invalidas. */
    }
    return null;
}
