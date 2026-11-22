import { query } from "../../db.ts";

/**
 * Criterios y opciones disponibles para la consulta de funciones.
 */
export interface FiltrosFunciones {
    peliculaId?: number;
    cineId?: string;
}

/** Funciones vigentes y no agotadas, con filtros opcionales por película y cine.
 * @param filtros Filtros opcionales que limitan los registros procesados.
 * @returns Lista de resultados encontrados o transformados.
 */
export async function listarFunciones({
    peliculaId,
    cineId,
}: FiltrosFunciones) {
    const conditions: string[] = [
        "(h.fecha + h.horario) >= (NOW() AT TIME ZONE 'America/Santiago')",
        "h.agotada = FALSE",
    ];

    const params: unknown[] = [];

    if (peliculaId !== undefined) {
        params.push(peliculaId);
        conditions.push(`h.pelicula_id = $${params.length}`);
    }

    if (cineId !== undefined) {
        params.push(cineId);
        conditions.push(`h.cine_id = $${params.length}`);
    }

    const whereClause =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const { rows } = await query(
        `
        SELECT
            h.id,
            (h.fecha + h.horario) AS "fechaHora",
            (SELECT MIN(precio) FROM tarifas WHERE horario_id = h.id) AS precio,
            h.sala,
            h.formato_resumen AS formato,
            h.agotada,
            p.id AS "peliculaId",
            p.titulo AS "peliculaTitulo",
            p.imagen_url AS "peliculaImagenUrl",
            c.id AS "cineId",
            c.nombre AS "cineNombre"
        FROM horarios h
        INNER JOIN peliculas p ON h.pelicula_id = p.id
        INNER JOIN cines c ON h.cine_id = c.id
        ${whereClause}
        ORDER BY (h.fecha + h.horario) ASC;
    `,
        params,
    );

    return rows;
}

/** Función con los datos de su película y cine, o null si no existe.
 * @param id Identificador del registro que se consulta o modifica.
 * @returns Datos encontrados, o `null` cuando el registro no existe.
 */
export async function obtenerFuncion(id: number) {
    const { rows } = await query(
        `
        SELECT
            h.id,
            (h.fecha + h.horario) AS "fechaHora",
            (SELECT MIN(precio) FROM tarifas WHERE horario_id = h.id) AS precio,
            h.sala,
            h.formato_resumen AS formato,
            h.agotada,
            p.id AS "peliculaId",
            p.titulo AS "peliculaTitulo",
            p.duracion AS "peliculaDuracion",
            p.clasificacion AS "peliculaClasificacion",
            p.imagen_url AS "peliculaImagenUrl",
            c.id AS "cineId",
            c.nombre AS "cineNombre",
            c.direccion AS "cineDireccion"
        FROM horarios h
        INNER JOIN peliculas p ON h.pelicula_id = p.id
        INNER JOIN cines c ON h.cine_id = c.id
        WHERE h.id = $1;
    `,
        [id],
    );

    return rows[0] ?? null;
}
