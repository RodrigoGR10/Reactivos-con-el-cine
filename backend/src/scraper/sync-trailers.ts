import { pool } from "../db.ts";
import {
    buscarTrailerLatino,
    type MetadatosYoutube,
    type PeliculaConVideos,
} from "./tmdb/trailers.ts";

interface PeliculaPendiente {
    id: number;
    titulo: string;
    tmdb_id: number | null;
    trailer_url: string | null;
}

async function pedirJson<T>(url: URL): Promise<T | undefined> {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (response.status === 404 || response.status === 401 || response.status === 403) return undefined;
    if (!response.ok) throw new Error(`Consulta de video: HTTP ${response.status}`);
    return await response.json() as T;
}

export async function sincronizarTrailersLatinos(options: { apply?: boolean } = {}) {
    const apply = options.apply === true;
    const { rows } = await pool.query<PeliculaPendiente>(`
        SELECT id, titulo, tmdb_id, trailer_url
        FROM peliculas
        WHERE (trailer_idioma IS DISTINCT FROM 'es-419'
            OR trailer_version IS NULL OR trailer_version NOT IN ('doblado', 'original'))
          AND (tmdb_id IS NOT NULL OR trailer_url IS NOT NULL)
        ORDER BY id;
    `);
    const resumen = { revisadas: rows.length, confirmadas: 0, actualizadas: 0, sinVersionLatina: 0, errores: 0 };
    const youtubeCache = new Map<string, Promise<MetadatosYoutube | undefined>>();
    const peliculaCache = new Map<number, Promise<PeliculaConVideos | undefined>>();
    const consultarYoutube = (url: string) => {
        let pendiente = youtubeCache.get(url);
        if (!pendiente) {
            const endpoint = new URL("https://www.youtube.com/oembed");
            endpoint.searchParams.set("url", url);
            endpoint.searchParams.set("format", "json");
            pendiente = pedirJson<MetadatosYoutube>(endpoint).catch(() => undefined);
            youtubeCache.set(url, pendiente);
        }
        return pendiente;
    };
    const consultarPelicula = (id: number) => {
        let pendiente = peliculaCache.get(id);
        if (!pendiente) {
            const key = process.env.TMDB_API_KEY?.trim();
            if (!key) throw new Error("Falta TMDB_API_KEY para verificar el idioma de los trailers.");
            const endpoint = new URL(`https://api.themoviedb.org/3/movie/${id}`);
            endpoint.searchParams.set("api_key", key);
            endpoint.searchParams.set("language", "es-MX");
            endpoint.searchParams.set("append_to_response", "videos");
            pendiente = pedirJson<PeliculaConVideos>(endpoint);
            peliculaCache.set(id, pendiente);
        }
        return pendiente;
    };

    console.log(`Trailers pendientes de confirmar en espanol latino: ${rows.length}`);
    for (const [index, pelicula] of rows.entries()) {
        try {
            const datos = pelicula.tmdb_id ? await consultarPelicula(pelicula.tmdb_id) : {};
            if (pelicula.tmdb_id && !datos) throw new Error("No se pudo verificar la ficha de TMDB.");
            const trailer = await buscarTrailerLatino(pelicula.titulo, pelicula.trailer_url, datos ?? {}, consultarYoutube);
            if (!trailer) {
                resumen.sinVersionLatina++;
                console.log(`[${index + 1}/${rows.length}] ${pelicula.titulo}: sin audio latino confirmado.`);
                continue;
            }
            resumen.confirmadas++;
            if (apply) {
                const result = await pool.query(`
                    UPDATE peliculas
                    SET trailer_url = $1, trailer_idioma = 'es-419', trailer_version = $2,
                        trailer_encontrado_en = CASE
                            WHEN trailer_url = $1 THEN COALESCE(trailer_encontrado_en, NOW())
                            ELSE NOW() END
                    WHERE id = $3 AND trailer_url IS NOT DISTINCT FROM $4::text
                      AND (trailer_idioma IS DISTINCT FROM 'es-419'
                        OR trailer_version IS NULL OR trailer_version NOT IN ('doblado', 'original'));
                `, [trailer.url, trailer.version, pelicula.id, pelicula.trailer_url]);
                resumen.actualizadas += result.rowCount ?? 0;
            }
            console.log(`[${index + 1}/${rows.length}] ${pelicula.titulo}: ${trailer.version}, es-419.`);
        } catch (error) {
            resumen.errores++;
            console.error(`Trailer #${pelicula.id}: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }
    console.table(resumen);
    return resumen;
}
