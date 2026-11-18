import express from "express";
import { isNumericId, query } from "../db.ts";
import { incluirPopularidad } from "../services/popularidadPeliculas.ts";
import { normalizarClasificacion } from "../utils/clasificaciones.ts";
import { clasificarEstreno, type DatosEstreno, type EstadoEstreno } from "../utils/estreno.ts";
import { localNow } from "../utils/localNow.ts";
import { normalizarSinopsis } from "../utils/sinopsis.ts";

const router = express.Router();

interface PeliculaRow {
    id: number;
    titulo: string;
    titulo_original: string | null;
    sinopsis: string | null;
    duracion: number | null;
    genero: string | null;
    clasificacion: string | null;
    poster: string | null;
    trailerUrl: string | null;
    trailerVersion: "doblado" | "original" | "subtitulado" | null;
    banner: string | null;
    tmdb_id: number | null;
    calificacion_tmdb: number | null;
    votos_tmdb: number | null;
    popularidad_tmdb: number | null;
    fecha_estreno_tmdb: string | null;
    total_cines?: number;
    total_funciones?: number;
}

interface FuenteRow {
    pelicula_id: number;
    origen: string;
    origen_id: string;
    estado_estreno: EstadoEstreno | null;
    fecha_estreno: string | null;
}

const PELICULA_COLUMNS = `
    p.id,
    p.titulo,
    p.titulo_original,
    p.sinopsis,
    p.duracion,
    p.genero,
    p.clasificacion,
    p.imagen_url AS poster,
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

function serializarPelicula(
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

router.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
});

router.get("/", async (req, res) => {
    const { cartelera } = req.query;

    if (
        cartelera !== undefined &&
        cartelera !== "true" &&
        cartelera !== "false"
    ) {
        return res
            .status(400)
            .json({ error: "cartelera debe ser true o false" });
    }

    const hoy = localNow().slice(0, 10);

    if (cartelera === "true") {
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
            query<{
                pelicula_id: number;
                estado_estreno: EstadoEstreno | null;
                fecha_estreno: string | null;
            }>(`
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

        const fuentesPorId = new Map<number, DatosEstreno[]>();
        for (const row of fuentesActivas) {
            const lista = fuentesPorId.get(row.pelicula_id) ?? [];
            lista.push({
                estadoEstreno: row.estado_estreno ?? undefined,
                fechaEstreno: row.fecha_estreno ?? undefined,
            });
            fuentesPorId.set(row.pelicula_id, lista);
        }

        const disponibles = peliculas
            .map((row) =>
                serializarPelicula(row, fuentesPorId.get(row.id) ?? [], hoy, {
                    totalCines: row.total_cines ?? 0,
                    totalFunciones: row.total_funciones ?? 0,
                }),
            )
            .filter((pelicula) => pelicula.estadoEstreno !== "proximamente");

        return res.json(await incluirPopularidad(disponibles));
    }

    const { rows } = await query<PeliculaRow>(`
        SELECT ${PELICULA_COLUMNS}
        FROM peliculas p
        ORDER BY p.titulo ASC;
    `);

    const fuentes = await fuentesPorPelicula(rows.map((r) => r.id));
    const todas = rows.map((row) =>
        serializarPelicula(
            row,
            (fuentes.get(row.id) ?? []).map((f) => ({
                estadoEstreno: f.estado_estreno ?? undefined,
                fechaEstreno: f.fecha_estreno ?? undefined,
            })),
            hoy,
        ),
    );

    return res.json(await incluirPopularidad(todas));
});

router.get("/:id", async (req, res) => {
    const { id } = req.params;

    if (typeof id !== "string" || !isNumericId(id)) {
        return res.status(400).json({ error: "ID de película inválido" });
    }

    const movieId = parseInt(id, 10);
    const { rows } = await query<PeliculaRow>(
        `
        SELECT ${PELICULA_COLUMNS}
        FROM peliculas p
        WHERE p.id = $1;
        `,
        [movieId],
    );

    if (rows.length === 0) {
        return res.status(404).json({ error: "Película no encontrada" });
    }

    const fuentes = await fuentesPorPelicula([movieId]);
    const hoy = localNow().slice(0, 10);
    const pelicula = serializarPelicula(
        rows[0]!,
        (fuentes.get(movieId) ?? []).map((f) => ({
            estadoEstreno: f.estado_estreno ?? undefined,
            fechaEstreno: f.fecha_estreno ?? undefined,
        })),
        hoy,
    );

    const [publica] = await incluirPopularidad([pelicula]);
    return res.json(publica);
});

export default router;
