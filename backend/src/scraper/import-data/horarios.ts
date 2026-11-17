import type { PoolClient } from "pg";

import type { ScrapedSchedule } from "../types.ts";
import { sourceId } from "./identificadores.ts";

interface UpsertScheduleResult {
    id: number;
    inserted: boolean;
    invalidated: number;
}

export async function upsertSchedule(
    client: PoolClient,
    schedule: ScrapedSchedule,
    peliculaId: number,
    cineId: string,
    peliculaUrl: string | null = null,
): Promise<UpsertScheduleResult> {
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
    const hasButacas = Boolean(schedule.butacas);
    const butacasDisponibles = schedule.butacas?.disponibles ?? null;
    const butacasTotal = schedule.butacas?.total ?? null;
    const butacasConsultadasEn = schedule.butacas?.consultadasEn ?? null;
    const butacasRevision = schedule.butacas ? schedule.revision : null;
    const butacasActualizadasEn = schedule.butacas?.consultadasEn ?? null;

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
                pelicula_url = COALESCE($18, pelicula_url),
                sesion_id = $6,
                fecha = $7,
                horario = $8,
                fecha_cartelera = $9,
                formato_resumen = $10,
                idioma = $11,
                sala = $12,
                agotada = $13,
                url_compra = COALESCE($14, url_compra),
                revision = $15,
                extraido_en = $16,
                precios_revision =
                    CASE WHEN $17 THEN NULL ELSE precios_revision END,
                precios_consultados_en =
                    CASE WHEN $17 THEN NULL ELSE precios_consultados_en END,
                precios_error_hasta =
                    CASE WHEN $17 THEN NULL ELSE precios_error_hasta END,
                precios_error_revision =
                    CASE WHEN $17 THEN NULL ELSE precios_error_revision END,
                consulta_precios_hasta =
                    CASE WHEN $17 THEN NULL ELSE consulta_precios_hasta END,
                consulta_precios_revision =
                    CASE WHEN $17 THEN NULL ELSE consulta_precios_revision END,
                consulta_precios_token =
                    CASE WHEN $17 THEN NULL ELSE consulta_precios_token END,
                butacas_disponibles =
                    CASE WHEN $19 THEN $20 WHEN $17 THEN NULL ELSE butacas_disponibles END,
                butacas_total =
                    CASE WHEN $19 THEN $21 WHEN $17 THEN NULL ELSE butacas_total END,
                butacas_consultadas_en =
                    CASE WHEN $19 THEN $22::timestamptz WHEN $17 THEN NULL ELSE butacas_consultadas_en END,
                butacas_revision =
                    CASE WHEN $19 THEN $23 WHEN $17 THEN NULL ELSE butacas_revision END,
                butacas_actualizadas_en =
                    CASE WHEN $19 THEN $24::timestamptz WHEN $17 THEN NULL ELSE butacas_actualizadas_en END,
                butacas_error_hasta =
                    CASE WHEN $19 OR $17 THEN NULL ELSE butacas_error_hasta END,
                butacas_error_revision =
                    CASE WHEN $19 OR $17 THEN NULL ELSE butacas_error_revision END
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
                peliculaUrl,
                hasButacas,
                butacasDisponibles,
                butacasTotal,
                butacasConsultadasEn,
                butacasRevision,
                butacasActualizadasEn,
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
            pelicula_url,
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
            extraido_en,
            butacas_disponibles,
            butacas_total,
            butacas_consultadas_en,
            butacas_revision,
            butacas_actualizadas_en
        )
        VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
            $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
        )
        RETURNING id;
        `,
        [
            schedule.origenId,
            peliculaId,
            cineId,
            schedule.origen,
            peliculaOrigenId,
            peliculaUrl,
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
            butacasDisponibles,
            butacasTotal,
            butacasConsultadasEn,
            butacasRevision,
            butacasActualizadasEn,
        ],
    );

    return {
        id: inserted.rows[0].id,
        inserted: true,
        invalidated: 0,
    };
}
