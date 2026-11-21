import { pool } from "../db.ts";
import {
    buscarTrailerEspanol,
    type MetadatosYoutube,
    type PeliculaConVideos,
} from "./tmdb/trailers.ts";

interface PeliculaPendiente {
    id: number;
    titulo: string;
    tmdb_id: number | null;
    trailer_url: string | null;
    trailer_idioma: string | null;
    firma_revision: string;
}

interface ConsultaYoutube {
    promise: Promise<MetadatosYoutube | undefined>;
    error: boolean;
}

async function pedirJson<T>(url: URL): Promise<T | undefined> {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (response.status === 404) return undefined;
    if (!response.ok)
        throw new Error(`Consulta de video: HTTP ${response.status}`);
    return (await response.json()) as T;
}

export async function sincronizarTrailersEnEspanol(
    options: { apply?: boolean } = {},
) {
    const apply = options.apply === true;
    const { rows } = await pool.query<PeliculaPendiente>(`
        SELECT id, titulo, tmdb_id, trailer_url, trailer_idioma,
               md5(jsonb_build_array('v2', titulo, tmdb_id, trailer_url)::text) AS firma_revision
        FROM peliculas
        WHERE (trailer_idioma IS DISTINCT FROM 'es-419'
            OR trailer_version IS NULL OR trailer_version NOT IN ('doblado', 'original'))
          AND (tmdb_id IS NOT NULL OR trailer_url IS NOT NULL)
          AND (
            trailer_sin_resultado_firma IS DISTINCT FROM md5(jsonb_build_array('v2', titulo, tmdb_id, trailer_url)::text)
            OR trailer_sin_resultado_en IS NULL
            OR trailer_sin_resultado_en <= NOW() - INTERVAL '30 days'
          )
        ORDER BY id;
    `);
    const resumen = {
        revisadas: rows.length,
        confirmadas: 0,
        actualizadas: 0,
        sinVersionEspanol: 0,
        errores: 0,
    };
    const youtubeCache = new Map<string, ConsultaYoutube>();
    const peliculaCache = new Map<
        number,
        Promise<PeliculaConVideos | undefined>
    >();
    let urlsYoutubeActuales = new Set<string>();
    const consultarYoutube = (url: string) => {
        urlsYoutubeActuales.add(url);
        let pendiente = youtubeCache.get(url);
        if (!pendiente) {
            const endpoint = new URL("https://www.youtube.com/oembed");
            endpoint.searchParams.set("url", url);
            endpoint.searchParams.set("format", "json");
            pendiente = { error: false, promise: Promise.resolve(undefined) };
            pendiente.promise = pedirJson<MetadatosYoutube>(endpoint).catch(
                () => {
                    if (pendiente) pendiente.error = true;
                    return undefined;
                },
            );
            youtubeCache.set(url, pendiente);
        }
        return pendiente.promise;
    };
    const consultarPelicula = (id: number) => {
        let pendiente = peliculaCache.get(id);
        if (!pendiente) {
            const key = process.env.TMDB_API_KEY?.trim();
            if (!key)
                throw new Error(
                    "Falta TMDB_API_KEY para verificar el idioma de los trailers.",
                );
            const endpoint = new URL(
                `https://api.themoviedb.org/3/movie/${id}`,
            );
            endpoint.searchParams.set("api_key", key);
            endpoint.searchParams.set("language", "es-MX");
            endpoint.searchParams.set(
                "include_video_language",
                "es,en,ja,ko,fr,de,it,pt,null",
            );
            endpoint.searchParams.set("append_to_response", "videos");
            pendiente = pedirJson<PeliculaConVideos>(endpoint);
            peliculaCache.set(id, pendiente);
        }
        return pendiente;
    };

    console.log(`Trailers pendientes de confirmar: ${rows.length}`);
    for (const [index, pelicula] of rows.entries()) {
        urlsYoutubeActuales = new Set<string>();
        try {
            const datos = pelicula.tmdb_id
                ? await consultarPelicula(pelicula.tmdb_id)
                : {};
            if (pelicula.tmdb_id && !datos)
                throw new Error("No se pudo verificar la ficha de TMDB.");
            // Solo considerar actual como avance del cine si aún no fue etiquetado como fallback TMDB.
            const trailerDelCine =
                pelicula.trailer_idioma === null ||
                pelicula.trailer_idioma === "es-419"
                    ? pelicula.trailer_url
                    : null;
            const trailer = await buscarTrailerEspanol(
                pelicula.titulo,
                trailerDelCine,
                datos ?? {},
                consultarYoutube,
            );
            if (!trailer) {
                if (
                    [...urlsYoutubeActuales].some(
                        (url) => youtubeCache.get(url)?.error,
                    )
                ) {
                    throw new Error(
                        "No se pudo verificar uno o más videos de YouTube; se volverán a intentar en la próxima ejecución.",
                    );
                }
                resumen.sinVersionEspanol++;
                if (apply) {
                    await pool.query(
                        `
                        UPDATE peliculas
                        SET trailer_sin_resultado_firma = $1,
                            trailer_sin_resultado_en = NOW()
                        WHERE id = $2
                          AND md5(jsonb_build_array('v2', titulo, tmdb_id, trailer_url)::text) = $1;
                    `,
                        [pelicula.firma_revision, pelicula.id],
                    );
                }
                console.log(
                    `[${index + 1}/${rows.length}] ${pelicula.titulo}: sin tráiler confirmado.`,
                );
                continue;
            }
            resumen.confirmadas++;
            if (apply) {
                const result = await pool.query(
                    `
                    UPDATE peliculas
                    SET trailer_url = $1, trailer_idioma = $5, trailer_version = $2,
                        trailer_sin_resultado_firma = NULL, trailer_sin_resultado_en = NULL,
                        trailer_encontrado_en = CASE
                            WHEN trailer_url = $1 THEN COALESCE(trailer_encontrado_en, NOW())
                            ELSE NOW() END
                    WHERE id = $3 AND trailer_url IS NOT DISTINCT FROM $4::text
                      AND (
                        (
                            trailer_idioma IS DISTINCT FROM 'es-419'
                            AND (
                                trailer_url IS DISTINCT FROM $1
                                OR trailer_idioma IS DISTINCT FROM $5
                                OR trailer_version IS DISTINCT FROM $2
                            )
                        )
                        OR (
                            (
                                CASE
                                    WHEN trailer_idioma = 'es-419' AND trailer_version IN ('doblado', 'original') THEN 6
                                    WHEN trailer_idioma = 'es-419' AND trailer_version = 'subtitulado' THEN 5
                                    WHEN trailer_idioma = 'es-419' AND trailer_version = 'espanol' THEN 4
                                    WHEN trailer_idioma = 'es-ES' AND trailer_version IN ('doblado', 'original', 'subtitulado') THEN 3
                                    WHEN trailer_idioma IS NOT NULL AND trailer_version IN ('original', 'subtitulado') THEN 2
                                    WHEN trailer_idioma IS NOT NULL AND trailer_version IN ('otro', 'doblado', 'espanol') THEN 1
                                    ELSE 0
                                END
                            ) < (
                                CASE
                                    WHEN $5::text = 'es-419' AND $2::text IN ('doblado', 'original') THEN 6
                                    WHEN $5::text = 'es-419' AND $2::text = 'subtitulado' THEN 5
                                    WHEN $5::text = 'es-419' AND $2::text = 'espanol' THEN 4
                                    WHEN $5::text = 'es-ES' AND $2::text IN ('doblado', 'original', 'subtitulado') THEN 3
                                    WHEN $5::text IS NOT NULL AND $2::text IN ('original', 'subtitulado') THEN 2
                                    WHEN $5::text IS NOT NULL AND $2::text IN ('otro', 'doblado', 'espanol') THEN 1
                                    ELSE 0
                                END
                            )
                        )
                      );
                `,
                    [
                        trailer.url,
                        trailer.version,
                        pelicula.id,
                        pelicula.trailer_url,
                        trailer.idioma,
                    ],
                );
                resumen.actualizadas += result.rowCount ?? 0;
            }
            console.log(
                `[${index + 1}/${rows.length}] ${pelicula.titulo}: ${trailer.version}, ${trailer.idioma}.`,
            );
        } catch (error) {
            resumen.errores++;
            console.error(
                `Trailer #${pelicula.id}: ${error instanceof Error ? error.message : String(error)}`,
            );
        } finally {
            await new Promise((resolve) => setTimeout(resolve, 200));
        }
    }
    console.table(resumen);
    return resumen;
}
