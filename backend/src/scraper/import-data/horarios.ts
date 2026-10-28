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
