import type { MetadatosYoutube, PeliculaConVideos } from "./trailers.ts";

async function pedirJson<T>(url: URL): Promise<T | undefined> {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });

    if (response.status === 404) return undefined;

    if (!response.ok)
        throw new Error(`${url.hostname}: HTTP ${response.status}`);
    return (await response.json()) as T;
}

export function consultarMetadatosYoutube(url: string) {
    const endpoint = new URL("https://www.youtube.com/oembed");
    endpoint.searchParams.set("url", url);
    endpoint.searchParams.set("format", "json");
    return pedirJson<MetadatosYoutube>(endpoint);
}

export async function consultarPeliculaTrailerTmdb(id: number) {
    const key = process.env.TMDB_API_KEY?.trim();
    if (!key) throw new Error("Falta TMDB_API_KEY para consultar TMDB.");
    const endpoint = new URL(`https://api.themoviedb.org/3/movie/${id}`);
    endpoint.searchParams.set("api_key", key);
    endpoint.searchParams.set("language", "es-MX");
    endpoint.searchParams.set(
        "include_video_language",
        "es,en,ja,ko,fr,de,it,pt,null",
    );
    endpoint.searchParams.set("append_to_response", "videos,translations");
    return pedirJson<PeliculaConVideos>(endpoint);
}
