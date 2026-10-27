import { pool } from "../db.ts";
import type {
    ScrapeResult,
    ScrapedCinema,
    ScrapedMovie,
    ScrapedSchedule,
} from "./types.ts";

interface ImportSummary {
    cines: number;
    peliculasInsertadas: number;
    peliculasActualizadas: number;
    horariosInsertados: number;
    horariosActualizados: number;
    horariosEliminados: number;
    tarifasInvalidadas: number;
    limpiezaEjecutada: boolean;
}

function sourceId(value: string, origen: string): string {
    const prefix = `${origen}:`;

    if (!value.startsWith(prefix)) {
        throw new Error(
            `Identificador ${value} incompatible con el origen ${origen}.`,
        );
    }

    const id = value.slice(prefix.length).trim();

    if (!id) {
        throw new Error(`Identificador de origen vacío: ${value}.`);
    }

    return id;
}

function fechaLimite(desde: string, dias: number | null): string | null {
    if (dias === null) return null;

    const date = new Date(`${desde}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + dias);

    return date.toISOString().slice(0, 10);
}

async function upsertCinema(
    client: Awaited<ReturnType<typeof pool.connect>>,
    cine: ScrapedCinema,
): Promise<string> {
    const result = await client.query<{ id: string }>(
        `
        INSERT INTO cines (
            id, nombre, direccion, comuna, ciudad,
            cadena, origen_id, url, logo_url, latitud, longitud
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (cadena, origen_id) DO UPDATE SET
            nombre = EXCLUDED.nombre,
            direccion = EXCLUDED.direccion,
            comuna = EXCLUDED.comuna,
            ciudad = EXCLUDED.ciudad,
            url = EXCLUDED.url,
            logo_url = EXCLUDED.logo_url,
            latitud = EXCLUDED.latitud,
            longitud = EXCLUDED.longitud
        RETURNING id;
        `,
        [
            cine.id,
            cine.nombre,
            cine.direccion,
            cine.comuna,
            cine.ciudad,
            cine.origen,
            cine.origenId,
            cine.url,
            cine.logo,
            cine.latitud ?? null,
            cine.longitud ?? null,
        ],
    );

    return result.rows[0].id;
}

async function upsertMovie(
    client: Awaited<ReturnType<typeof pool.connect>>,
    pelicula: ScrapedMovie,
): Promise<{ id: number; inserted: boolean }> {
    // Serializa importaciones concurrentes de la misma película de origen.
    await client.query(
        `SELECT pg_advisory_xact_lock(hashtextextended($1, 0));`,
        [`pelicula:${pelicula.origen}:${pelicula.origenId}`],
    );

    const existing = await client.query<{ pelicula_id: number }>(
        `
        SELECT pelicula_id
        FROM pelicula_fuentes
        WHERE origen = $1 AND origen_id = $2
        FOR UPDATE;
        `,
        [pelicula.origen, pelicula.origenId],
    );

    const fechaEstreno =
        typeof pelicula.fechaEstreno === "string"
            ? pelicula.fechaEstreno
            : null;

    const estadoEstreno = pelicula.estadoEstreno ?? "cartelera";

    if (existing.rows.length > 0) {
        const id = existing.rows[0].pelicula_id;

        await client.query(
            `
            UPDATE peliculas
            SET titulo = $2,
                sinopsis = $3,
                duracion = $4,
                genero = $5,
                clasificacion = $6,
                imagen_url = $7
            WHERE id = $1;
            `,
            [
                id,
                pelicula.titulo,
                pelicula.sinopsis,
                pelicula.duracion,
                pelicula.genero,
                pelicula.clasificacion,
                pelicula.poster,
            ],
        );

        await client.query(
            `
            UPDATE pelicula_fuentes
            SET url = $3,
                estado_estreno = $4,
                fecha_estreno = $5
            WHERE origen = $1 AND origen_id = $2;
            `,
            [
                pelicula.origen,
                pelicula.origenId,
                pelicula.url ?? null,
                estadoEstreno,
                fechaEstreno,
            ],
        );

        return { id, inserted: false };
    }

    const inserted = await client.query<{ id: number }>(
        `
        INSERT INTO peliculas (
            titulo, sinopsis, duracion, genero,
            clasificacion, imagen_url
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id;
        `,
        [
            pelicula.titulo,
            pelicula.sinopsis,
            pelicula.duracion,
            pelicula.genero,
            pelicula.clasificacion,
            pelicula.poster,
        ],
    );

    const id = inserted.rows[0].id;

    await client.query(
        `
        INSERT INTO pelicula_fuentes (
            origen, origen_id, pelicula_id,
            url, estado_estreno, fecha_estreno
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (origen, origen_id) DO UPDATE SET
            pelicula_id = EXCLUDED.pelicula_id,
            url = EXCLUDED.url,
            estado_estreno = EXCLUDED.estado_estreno,
            fecha_estreno = EXCLUDED.fecha_estreno;
        `,
        [
            pelicula.origen,
            pelicula.origenId,
            id,
            pelicula.url ?? null,
            estadoEstreno,
            fechaEstreno,
        ],
    );

    return { id, inserted: true };
}

async function resolveMovieId(
    client: Awaited<ReturnType<typeof pool.connect>>,
    schedule: ScrapedSchedule,
    movieIds: Map<string, number>,
): Promise<number> {
    const cached = movieIds.get(schedule.peliculaId);
    if (cached) return cached;

    const externalId = sourceId(schedule.peliculaId, schedule.origen);

    const result = await client.query<{ pelicula_id: number }>(
        `
        SELECT pelicula_id
        FROM pelicula_fuentes
        WHERE origen = $1 AND origen_id = $2;
        `,
        [schedule.origen, externalId],
    );

    if (!result.rows[0]) {
        throw new Error(
            `No existe la película ${schedule.peliculaId} en pelicula_fuentes.`,
        );
    }

    movieIds.set(schedule.peliculaId, result.rows[0].pelicula_id);
    return result.rows[0].pelicula_id;
}

async function resolveCinemaId(
    client: Awaited<ReturnType<typeof pool.connect>>,
    schedule: ScrapedSchedule,
    cinemaIds: Map<string, string>,
): Promise<string> {
    const cached = cinemaIds.get(schedule.cineId);
    if (cached) return cached;

    const externalId = sourceId(schedule.cineId, schedule.origen);

    const result = await client.query<{ id: string }>(
        `
        SELECT id
        FROM cines
        WHERE cadena = $1 AND origen_id = $2;
        `,
        [schedule.origen, externalId],
    );

    if (!result.rows[0]) {
        throw new Error(`No existe el cine ${schedule.cineId} en PostgreSQL.`);
    }

    cinemaIds.set(schedule.cineId, result.rows[0].id);
    return result.rows[0].id;
}

async function upsertSchedule(
    client: Awaited<ReturnType<typeof pool.connect>>,
    schedule: ScrapedSchedule,
    peliculaId: number,
    cineId: string,
): Promise<{ id: number; inserted: boolean; invalidated: number }> {
    // Evita que dos importaciones creen o actualicen simultáneamente
    // la misma sesión.
    await client.query(
        `SELECT pg_advisory_xact_lock(hashtextextended($1, 0));`,
        [`horario:${schedule.origen}:${cineId}:${schedule.sesionId}`],
    );

    const existing = await client.query<{
        id: number;
        revision: string;
    }>(
        `
        SELECT id, revision
        FROM horarios
        WHERE origen = $1
          AND cine_id = $2
          AND sesion_id = $3
        FOR UPDATE;
        `,
        [schedule.origen, cineId, schedule.sesionId],
    );

    const peliculaOrigenId = sourceId(schedule.peliculaId, schedule.origen);

    if (existing.rows.length > 0) {
        const current = existing.rows[0];
        const changed = current.revision !== schedule.revision;

        let invalidated = 0;

        if (changed) {
            const deleted = await client.query(
                `DELETE FROM tarifas WHERE horario_id = $1;`,
                [current.id],
            );

            invalidated = deleted.rowCount ?? 0;
        }

        await client.query(
            `
            UPDATE horarios
            SET origen_id = $2,
                pelicula_id = $3,
                cine_id = $4,
                pelicula_origen_id = $5,
                sesion_id = $6,
                fecha = $7,
                horario = $8,
                fecha_cartelera = $9,
                formato_resumen = $10,
                idioma = $11,
                sala = $12,
                agotada = $13,
                url_compra = $14,
                revision = $15,
                extraido_en = $16,
                precios_consultados_en =
                    CASE WHEN $17 THEN NULL ELSE precios_consultados_en END,
                precios_error_hasta =
                    CASE WHEN $17 THEN NULL ELSE precios_error_hasta END,
                consulta_precios_hasta =
                    CASE WHEN $17 THEN NULL ELSE consulta_precios_hasta END,
                consulta_precios_token =
                    CASE WHEN $17 THEN NULL ELSE consulta_precios_token END
            WHERE id = $1;
            `,
            [
                current.id,
                schedule.origenId,
                peliculaId,
                cineId,
                peliculaOrigenId,
                schedule.sesionId,
                schedule.fecha,
                schedule.horario,
                schedule.fechaCartelera,
                schedule.formatoResumen,
                schedule.idioma,
                schedule.sala,
                schedule.agotada,
                schedule.urlCompra ?? null,
                schedule.revision,
                schedule.extraidoEn,
                changed,
            ],
        );

        return {
            id: current.id,
            inserted: false,
            invalidated,
        };
    }

    const inserted = await client.query<{ id: number }>(
        `
        INSERT INTO horarios (
            origen_id,
            pelicula_id,
            cine_id,
            origen,
            pelicula_origen_id,
            sesion_id,
            fecha,
            horario,
            fecha_cartelera,
            formato_resumen,
            idioma,
            sala,
            agotada,
            url_compra,
            revision,
            extraido_en
        )
        VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8,
            $9, $10, $11, $12, $13, $14, $15, $16
        )
        RETURNING id;
        `,
        [
            schedule.origenId,
            peliculaId,
            cineId,
            schedule.origen,
            peliculaOrigenId,
            schedule.sesionId,
            schedule.fecha,
            schedule.horario,
            schedule.fechaCartelera,
            schedule.formatoResumen,
            schedule.idioma,
            schedule.sala,
            schedule.agotada,
            schedule.urlCompra ?? null,
            schedule.revision,
            schedule.extraidoEn,
        ],
    );

    return {
        id: inserted.rows[0].id,
        inserted: true,
        invalidated: 0,
    };
}

function canCleanStaleSchedules(data: ScrapeResult): boolean {
    return (
        data.meta.completo &&
        data.meta.limitePorCine === null &&
        data.meta.cinesSeleccionados > 0 &&
        data.meta.cinesProcesados === data.meta.cinesSeleccionados &&
        data.cines.length === data.meta.cinesSeleccionados &&
        data.incidencias.length === 0
    );
}

export async function importarDatosScraped(
    data: ScrapeResult,
): Promise<ImportSummary> {
    for (const cine of data.cines) {
        if (cine.origen !== data.meta.origen) {
            throw new Error(`El cine ${cine.id} pertenece a otro origen.`);
        }
    }

    for (const pelicula of data.peliculas) {
        if (pelicula.origen !== data.meta.origen) {
            throw new Error(
                `La película ${pelicula.id} pertenece a otro origen.`,
            );
        }
    }

    for (const horario of data.horarios) {
        if (horario.origen !== data.meta.origen) {
            throw new Error(
                `El horario ${horario.id} pertenece a otro origen.`,
            );
        }
    }

    const client = await pool.connect();

    const summary: ImportSummary = {
        cines: 0,
        peliculasInsertadas: 0,
        peliculasActualizadas: 0,
        horariosInsertados: 0,
        horariosActualizados: 0,
        horariosEliminados: 0,
        tarifasInvalidadas: 0,
        limpiezaEjecutada: false,
    };

    try {
        await client.query("BEGIN");

        const cinemaIds = new Map<string, string>();
        const movieIds = new Map<string, number>();

        // 1. Cines
        for (const cine of data.cines) {
            const id = await upsertCinema(client, cine);
            cinemaIds.set(cine.id, id);
            summary.cines++;
        }

        // 2. Películas y sus fuentes
        for (const pelicula of data.peliculas) {
            const result = await upsertMovie(client, pelicula);
            movieIds.set(pelicula.id, result.id);

            if (result.inserted) {
                summary.peliculasInsertadas++;
            } else {
                summary.peliculasActualizadas++;
            }
        }

        // 3. Horarios
        const keptScheduleIds: number[] = [];

        for (const schedule of data.horarios) {
            if (schedule.origen !== data.meta.origen) {
                throw new Error(
                    `El horario ${schedule.id} pertenece a ${schedule.origen}, no a ${data.meta.origen}.`,
                );
            }

            const peliculaId = await resolveMovieId(client, schedule, movieIds);

            const cineId = await resolveCinemaId(client, schedule, cinemaIds);

            const result = await upsertSchedule(
                client,
                schedule,
                peliculaId,
                cineId,
            );

            keptScheduleIds.push(result.id);
            summary.tarifasInvalidadas += result.invalidated;

            if (result.inserted) {
                summary.horariosInsertados++;
            } else {
                summary.horariosActualizados++;
            }
        }

        // 4. Limpieza selectiva: solo si la extracción fue completa,
        // sin límites, y todos los cines seleccionados se procesaron.
        if (canCleanStaleSchedules(data)) {
            const cinemaDbIds = [...new Set(cinemaIds.values())];

            if (cinemaDbIds.length > 0) {
                const deleted = await client.query(
                    `
                    DELETE FROM horarios h
                    WHERE h.origen = $1
                      AND h.cine_id = ANY($2::text[])
                      AND h.fecha_cartelera >= $3::date
                      AND (
                          $4::date IS NULL
                          OR h.fecha_cartelera < $4::date
                      )
                      AND NOT (h.id = ANY($5::int[]));
                    `,
                    [
                        data.meta.origen,
                        cinemaDbIds,
                        data.meta.desde,
                        fechaLimite(data.meta.desde, data.meta.dias),
                        keptScheduleIds,
                    ],
                );

                summary.horariosEliminados = deleted.rowCount ?? 0;
                summary.limpiezaEjecutada = true;
            }
        }

        await client.query("COMMIT");

        return summary;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}
