import { normalizarClasificacion } from "../../utils/clasificaciones.ts";
import { clasificarEstreno, type DatosEstreno } from "../../utils/estreno.ts";
import { normalizarSinopsis } from "../../utils/sinopsis.ts";
import type { FuenteRow, PeliculaRow } from "./tipos.ts";

/** Convierte las fuentes de una película al formato que espera clasificarEstreno. */
export const fuentesAEstreno = (fuentes: FuenteRow[]): DatosEstreno[] =>
    fuentes.map((fuente) => ({
        estadoEstreno: fuente.estado_estreno ?? undefined,
        fechaEstreno: fuente.fecha_estreno ?? undefined,
    }));

export function serializarPelicula(
    row: PeliculaRow,
    fuentes: DatosEstreno[],
    hoy: string,
    extras: { totalCines?: number; totalFunciones?: number } = {},
) {
    return {
        id: String(row.id),
        titulo: row.titulo,
        ...(row.titulo_original ? { tituloOriginal: row.titulo_original } : {}),
        duracion: row.duracion,
        genero: row.genero ?? "",
        clasificacion: normalizarClasificacion(row.clasificacion),
        sinopsis: normalizarSinopsis(row.sinopsis),
        poster: row.poster ?? "",
        ...(row.posterLimpio ? { posterLimpio: row.posterLimpio } : {}),
        ...(row.trailerUrl ? { trailerUrl: row.trailerUrl } : {}),
        ...(row.trailerVersion ? { trailerVersion: row.trailerVersion } : {}),
        ...(row.banner ? { banner: row.banner } : {}),
        ...(row.tmdb_id !== null ? { tmdbId: row.tmdb_id } : {}),
        ...(row.calificacion_tmdb !== null
            ? { calificacionTmdb: Number(row.calificacion_tmdb) }
            : {}),
        ...(row.votos_tmdb !== null ? { votosTmdb: row.votos_tmdb } : {}),
        ...(row.popularidad_tmdb !== null
            ? { popularidadTmdb: Number(row.popularidad_tmdb) }
            : {}),
        ...(row.fecha_estreno_tmdb
            ? { fechaEstrenoTmdb: row.fecha_estreno_tmdb }
            : {}),
        ...clasificarEstreno(fuentes, hoy),
        ...extras,
    };
}
