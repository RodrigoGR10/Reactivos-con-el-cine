import type { PoolClient } from "pg";
import type { ScrapeResult } from "../types.ts";

function fechaLimite(desde: string, dias: number | null): string | null {
    if (dias === null) {
        return null;
    }

    const date = new Date(`${desde}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + dias);

    return date.toISOString().slice(0, 10);
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

export async function limpiarHorariosObsoletos(
    client: PoolClient,
    data: ScrapeResult,
    cinemaIds: Map<string, string>,
    keptScheduleIds: number[],
): Promise<number | null> {
    if (!canCleanStaleSchedules(data)) {
        return null;
    }

    const cinemaDbIds = [...new Set(cinemaIds.values())];

    if (cinemaDbIds.length === 0) {
        return null;
    }

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

    return deleted.rowCount ?? 0;
}
