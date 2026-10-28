import { randomUUID } from "node:crypto";
import { pool, query } from "../../db.ts";

import { extraerTarifas } from "./extraer-tarifas.ts";
import { cargarHorario } from "./horarios.ts";
import { isFresh, CACHE_PRECIOS_MS } from "./estado.ts";

import type { ScheduleRow, ScheduleWithPrices } from "./types.ts";

const RETRY_MS = 60_000;
const LOCK_MS = 5 * 60_000;

const consultas = new Map<string, Promise<ScheduleWithPrices | null>>();

export async function consultarHorario(
    schedule: ScheduleRow,
): Promise<ScheduleWithPrices | null> {
    if (schedule.agotada || isFresh(schedule)) {
        return cargarHorario(schedule.id);
    }

    if (
        schedule.precios_error_revision === schedule.revision &&
        schedule.precios_error_hasta &&
        new Date(schedule.precios_error_hasta).getTime() > Date.now()
    ) {
        return cargarHorario(schedule.id);
    }

    const key = `${schedule.id}:${schedule.revision}`;
    const existing = consultas.get(key);
    if (existing) return existing;

    const task = (async () => {
        const token = randomUUID();

        // El UPDATE condicional es el bloqueo atómico: solo una petición
        // puede adquirir el candado para esta revisión.
        const claimed = await query(
            `
            UPDATE horarios
            SET consulta_precios_token = $3,
                consulta_precios_revision = revision,
                consulta_precios_hasta = NOW() + ($4 * INTERVAL '1 millisecond')
            WHERE id = $1
              AND revision = $2
              AND agotada = FALSE
              AND (
                    precios_revision IS DISTINCT FROM revision
                    OR precios_consultados_en IS NULL
                    OR precios_consultados_en <= NOW() - ($5 * INTERVAL '1 millisecond')
              )
              AND (
                    consulta_precios_hasta IS NULL
                    OR consulta_precios_hasta <= NOW()
                    OR consulta_precios_revision IS DISTINCT FROM revision
              )
              AND (
                    precios_error_hasta IS NULL
                    OR precios_error_hasta <= NOW()
                    OR precios_error_revision IS DISTINCT FROM revision
              )
            RETURNING id;
            `,
            [schedule.id, schedule.revision, token, LOCK_MS, CACHE_PRECIOS_MS],
        );

        if (!claimed.rowCount) return cargarHorario(schedule.id);

        try {
            const tarifas = await extraerTarifas(schedule);

            const client = await pool.connect();
            try {
                await client.query("BEGIN");

                // Bloquea la fila y verifica que la revisión no haya cambiado
                // mientras se consultaban los sitios externos.
                const current = await client.query(
                    `
                    SELECT id
                    FROM horarios
                    WHERE id = $1
                      AND revision = $2
                      AND consulta_precios_token = $3
                    FOR UPDATE;
                    `,
                    [schedule.id, schedule.revision, token],
                );

                if (current.rowCount) {
                    await client.query(
                        `DELETE FROM tarifas WHERE horario_id = $1;`,
                        [schedule.id],
                    );

                    for (const tarifa of tarifas) {
                        await client.query(
                            `
                            INSERT INTO tarifas (
                                origen_id, horario_id, tipo_entrada, formato,
                                precio, cargo_servicio, precio_online,
                                url_compra, extraido_en
                            )
                            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9);
                            `,
                            [
                                tarifa.origenId,
                                schedule.id,
                                tarifa.tipoEntrada,
                                tarifa.formato,
                                tarifa.precio ?? null,
                                tarifa.cargoServicio ?? null,
                                tarifa.precioOnline,
                                tarifa.urlCompra,
                                tarifa.extraidoEn,
                            ],
                        );
                    }

                    await client.query(
                        `
                        UPDATE horarios
                        SET precios_revision = revision,
                            precios_consultados_en = NOW(),
                            precios_error_revision = NULL,
                            precios_error_hasta = NULL
                        WHERE id = $1;
                        `,
                        [schedule.id],
                    );
                }

                await client.query("COMMIT");
            } catch (error) {
                await client.query("ROLLBACK");
                throw error;
            } finally {
                client.release();
            }
        } catch (error) {
            console.warn(
                `No se pudieron consultar precios de la sesión ${schedule.sesion_id}:`,
                error instanceof Error ? error.message : "Error desconocido",
            );

            await query(
                `
                UPDATE horarios
                SET precios_error_revision = revision,
                    precios_error_hasta = NOW() + ($3 * INTERVAL '1 millisecond')
                WHERE id = $1
                  AND revision = $2
                  AND consulta_precios_token = $4;
                `,
                [schedule.id, schedule.revision, RETRY_MS, token],
            );
        } finally {
            await query(
                `
                UPDATE horarios
                SET consulta_precios_token = NULL,
                    consulta_precios_hasta = NULL,
                    consulta_precios_revision = NULL
                WHERE id = $1
                  AND consulta_precios_token = $2;
                `,
                [schedule.id, token],
            );
        }

        return cargarHorario(schedule.id);
    })().finally(() => consultas.delete(key));

    consultas.set(key, task);
    return task;
}
