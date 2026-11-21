const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set([
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "youtube-nocookie.com",
    "www.youtube-nocookie.com",
]);

export function normalizarTrailerUrl(value: unknown): string | undefined {
    if (typeof value !== "string" || !value.trim()) return undefined;
    const input = value.trim();
    if (VIDEO_ID.test(input)) return `https://www.youtube.com/watch?v=${input}`;
    try {
        const url = new URL(input.startsWith("//") ? `https:${input}` : input);
        if (
            !["https:", "http:"].includes(url.protocol) ||
            url.username ||
            url.password ||
            url.port
        )
            return undefined;
        let id: string | null | undefined;
        if (url.hostname === "youtu.be" || url.hostname === "www.youtu.be") {
            id = url.pathname.slice(1);
        } else if (YOUTUBE_HOSTS.has(url.hostname)) {
            id =
                url.pathname === "/watch"
                    ? url.searchParams.get("v")
                    : url.pathname.match(
                          /^\/(?:embed|shorts|live)\/([^/]+)\/?$/,
                      )?.[1];
        }
        if (id && VIDEO_ID.test(id))
            return `https://www.youtube.com/watch?v=${id}`;
        if (
            url.protocol === "https:" &&
            url.hostname === "pimcore-content.cinepolis.com" &&
            /\.mp4$/i.test(url.pathname)
        ) {
            url.hash = "";
            return url.href;
        }
    } catch {
        /* Un enlace invalido no impide importar la pelicula. */
    }
    return undefined;
}
