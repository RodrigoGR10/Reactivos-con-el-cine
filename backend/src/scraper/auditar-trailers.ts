import { pool } from "../db.ts";
import { normalizarTrailerUrl } from "../utils/trailer.ts";
import {
    consultarMetadatosYoutube,
    consultarPeliculaTrailerTmdb,
} from "./tmdb/trailer-metadatos.ts";
import { titulosDePelicula, verificarTituloTrailer } from "./tmdb/trailers.ts";

interface TrailerGuardado {
    id: number;
    titulo: string;
    titulo_original: string | null;
    tmdb_id: number | null;
    trailer_url: string;
}

const etiquetas = {
    coincide: "Título coincidente",
    sin_coincidencia: "Título distinto · revisar",
    sin_titulo: "Video sin título · revisar",
    video_descartado: "Video marcado como reacción, clip u otro",
    video_no_disponible: "Video no disponible",
    url_invalida: "URL inválida o sin soporte",
    error_de_consulta: "Error al consultar metadatos",
    revision_manual: "MP4 directo · revisar manualmente",
};

type EstadoAuditoria = keyof typeof etiquetas;

export async function auditarTrailersGuardados() {
    const { rows } = await pool.query<TrailerGuardado>(`
        SELECT id, titulo, titulo_original, tmdb_id, trailer_url
        FROM peliculas
        WHERE trailer_url IS NOT NULL
        ORDER BY id;
    `);
    const youtube = new Map<
        string,
        Awaited<ReturnType<typeof consultarMetadatosYoutube>>
    >();
    const tmdb = new Map<
        number,
        Awaited<ReturnType<typeof consultarPeliculaTrailerTmdb>>
    >();
    const resultados = new Map<EstadoAuditoria, number>();

    console.log("===== AUDITORÍA DE TRÁILERES (SOLO LECTURA) =====");
    console.log(`Películas con enlace guardado: ${rows.length}`);

    for (const [index, pelicula] of rows.entries()) {
        const url = normalizarTrailerUrl(pelicula.trailer_url);
        let estado: EstadoAuditoria = "url_invalida";
        let tituloVideo: string | undefined;
        let tituloTmdb: string | undefined;
        let detalle: string | undefined;

        if (url?.startsWith("https://www.youtube.com/")) {
            try {
                if (!youtube.has(url))
                    youtube.set(url, await consultarMetadatosYoutube(url));
                tituloVideo = youtube.get(url)?.title;
                const titulos = [
                    pelicula.titulo,
                    pelicula.titulo_original ?? "",
                ];
                if (tituloVideo && pelicula.tmdb_id !== null) {
                    const id = pelicula.tmdb_id;
                    if (!tmdb.has(id))
                        tmdb.set(id, await consultarPeliculaTrailerTmdb(id));
                    const ficha = tmdb.get(id);
                    tituloTmdb = ficha?.title;
                    if (!ficha) detalle = "Ficha TMDB no disponible";
                    if (ficha)
                        titulos.push(
                            ...titulosDePelicula(pelicula.titulo, ficha),
                        );
                }
                estado = verificarTituloTrailer(tituloVideo, titulos);
                if (estado === "sin_titulo" && !youtube.get(url))
                    estado = "video_no_disponible";
            } catch (error) {
                estado = "error_de_consulta";
                detalle =
                    error instanceof Error ? error.message : String(error);
            }
        } else if (url) {
            estado = "revision_manual";
            detalle = "El MP4 directo carece de metadatos de YouTube";
        }
        resultados.set(estado, (resultados.get(estado) ?? 0) + 1);
        console.log(
            `[${index + 1}/${rows.length}] ${pelicula.titulo} — ${etiquetas[estado]}`,
        );

        if (estado !== "coincide" || detalle) {
            const tmdbId = pelicula.tmdb_id ?? "sin ID";
            console.log(
                `    Película #${pelicula.id} · TMDB ${tmdbId}${tituloTmdb ? ` · ${tituloTmdb}` : ""}`,
            );
            if (tituloVideo) console.log(`    YouTube · ${tituloVideo}`);
            console.log(`    Enlace · ${pelicula.trailer_url}`);
            if (detalle) console.log(`    Detalle · ${detalle}`);
        }
    }

    const coincidencias = resultados.get("coincide") ?? 0;
    console.log("\n===== RESUMEN DE AUDITORÍA =====");
    console.table({
        "Películas revisadas": rows.length,
        "Títulos coincidentes": coincidencias,
        "Casos por revisar": rows.length - coincidencias,
    });

    const pendientes = [...resultados]
        .filter(([estado]) => estado !== "coincide")
        .map(([estado, cantidad]) => ({
            Estado: etiquetas[estado],
            Cantidad: cantidad,
        }));
    if (pendientes.length) console.table(pendientes);
}
