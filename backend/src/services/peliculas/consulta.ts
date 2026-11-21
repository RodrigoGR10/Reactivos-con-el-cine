import { query } from "../../db.ts";
import { localNow } from "../../utils/localNow.ts";
import { incluirPopularidad } from "../popularidadPeliculas.ts";
import { fuentesAEstreno, serializarPelicula } from "./serializar.ts";
import type { FuenteRow, PeliculaRow } from "./tipos.ts";

const PELICULA_COLUMNS = `
    p.id,
    p.titulo,
    p.titulo_original,
    p.sinopsis,
    p.duracion,
    p.genero,
    p.clasificacion,
    p.imagen_url AS poster,
    p.poster_limpio AS "posterLimpio",
    CASE
        WHEN p.trailer_idioma IS NOT NULL
            AND p.trailer_version IN ('doblado', 'original', 'subtitulado', 'espanol', 'otro')
        THEN p.trailer_url
        ELSE NULL
    END AS "trailerUrl",
    CASE
        WHEN p.trailer_idioma IS NOT NULL
            AND p.trailer_version IN ('doblado', 'original', 'subtitulado')
        THEN p.trailer_version
        ELSE NULL
    END AS "trailerVersion",
    p.banner,
    p.tmdb_id,
    p.calificacion_tmdb,
    p.votos_tmdb,
    p.popularidad_tmdb,
    p.fecha_estreno_tmdb
`;

async function fuentesPorPelicula(
    peliculaIds: number[],
): Promise<Map<number, FuenteRow[]>> {
    const map = new Map<number, FuenteRow[]>();
    if (!peliculaIds.length) return map;

    const { rows } = await query<FuenteRow>(
        `
        SELECT
            pf.pelicula_id,
            pf.origen,
            pf.origen_id,
            pf.estado_estreno,
            to_char(pf.fecha_estreno, 'YYYY-MM-DD') AS fecha_estreno
        FROM pelicula_fuentes pf
        WHERE pf.pelicula_id = ANY($1::int[]);
        `,
        [peliculaIds],
    );

    for (const row of rows) {
        const lista = map.get(row.pelicula_id) ?? [];
        lista.push(row);
        map.set(row.pelicula_id, lista);
    }

    return map;
}

async function listarEnCartelera() {
    const [{ rows: peliculas }, { rows: fuentesActivas }] = await Promise.all([
        query<PeliculaRow>(`
            SELECT
                ${PELICULA_COLUMNS},
                COUNT(DISTINCT h.cine_id)::int AS total_cines,
                COUNT(h.id)::int AS total_funciones
            FROM peliculas p
            INNER JOIN horarios_vigentes h ON h.pelicula_id = p.id
            WHERE h.agotada = FALSE
            GROUP BY p.id
            ORDER BY p.titulo ASC;
        `),
        query<FuenteRow>(`
            SELECT DISTINCT
                h.pelicula_id,
                h.origen,
                h.pelicula_origen_id,
                pf.estado_estreno,
                to_char(pf.fecha_estreno, 'YYYY-MM-DD') AS fecha_estreno
            FROM horarios_vigentes h
            LEFT JOIN pelicula_fuentes pf
              ON pf.pelicula_id = h.pelicula_id
             AND pf.origen = h.origen
             AND pf.origen_id = h.pelicula_origen_id
            WHERE h.agotada = FALSE;
        `),
    ]);

    const fuentesPorId = new Map<number, FuenteRow[]>();
    for (const row of fuentesActivas) {
        const lista = fuentesPorId.get(row.pelicula_id) ?? [];
        lista.push(row);
        fuentesPorId.set(row.pelicula_id, lista);
    }

    const hoy = localNow().slice(0, 10);

    const disponibles = peliculas
        .map((row) =>
            serializarPelicula(
                row,
                fuentesAEstreno(fuentesPorId.get(row.id) ?? []),
                hoy,
                {
                    totalCines: row.total_cines ?? 0,
                    totalFunciones: row.total_funciones ?? 0,
                },
            ),
        )
        .filter((pelicula) => pelicula.estadoEstreno !== "proximamente");

    return incluirPopularidad(disponibles);
}

async function listarTodas() {
    const { rows } = await query<PeliculaRow>(`
        SELECT ${PELICULA_COLUMNS}
        FROM peliculas p
        ORDER BY p.titulo ASC;
    `);

    const fuentes = await fuentesPorPelicula(rows.map((r) => r.id));
    const hoy = localNow().slice(0, 10);

    const todas = rows.map((row) =>
        serializarPelicula(
            row,
            fuentesAEstreno(fuentes.get(row.id) ?? []),
            hoy,
        ),
    );

    return incluirPopularidad(todas);
}

/** Catálogo público de películas, opcionalmente limitado a la cartelera vigente. */
export async function listarPeliculas(cartelera: boolean) {
    return cartelera ? listarEnCartelera() : listarTodas();
}

/** Película pública por id, o null si no existe. */
export async function obtenerPelicula(id: number) {
    const { rows } = await query<PeliculaRow>(
        `
        SELECT ${PELICULA_COLUMNS}
        FROM peliculas p
        WHERE p.id = $1;
        `,
        [id],
    );

    if (rows.length === 0) return null;

    const fuentes = await fuentesPorPelicula([id]);
    const hoy = localNow().slice(0, 10);
    const pelicula = serializarPelicula(
        rows[0]!,
        fuentesAEstreno(fuentes.get(id) ?? []),
        hoy,
    );

    const [publica] = await incluirPopularidad([pelicula]);
    return publica;
}
