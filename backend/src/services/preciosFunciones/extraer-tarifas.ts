import { cinemarkData, ensureCinemark } from "../../scraper/cinemark/client.ts";
import { normalizeSessions } from "../../scraper/cinemark/normalize.ts";
import { pricesForSchedule } from "../../scraper/cineplanet/normalize.ts";
import { pricesForSchedule as vistaPrices } from "../../scraper/vista/normalize.ts";

import type {
    RawPriceGroup,
    RawSession,
} from "../../scraper/cinemark/types.ts";
import type { ScrapedSession } from "../../scraper/types.ts";

import { buildSchedule } from "./horarios.ts";
import type { ScheduleRow } from "./types.ts";

function fechaISO(fecha: Date | string): string {
    if (fecha instanceof Date) {
        const year = fecha.getFullYear();
        const month = String(fecha.getMonth() + 1).padStart(2, "0");
        const day = String(fecha.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    return fecha.slice(0, 10);
}

export async function extraerTarifas(
    row: ScheduleRow,
): Promise<ScrapedSession[]> {
    const schedule = buildSchedule(row);

    if (row.origen === "cineplanet") {
        return pricesForSchedule(schedule);
    }

    if (row.origen === "muvix" || row.origen === "cinestar") {
        return vistaPrices(row.origen, schedule);
    }

    await ensureCinemark();

    const prices = await cinemarkData<RawPriceGroup[]>("/get-prices", {
        cinemaId: row.cine_origen_id,
        sessionId: row.sesion_id,
        feature: "0",
        salesChannelToken: "WWW",
        memberId: "invited",
    });

    const raw: RawSession = {
        corporateId: row.pelicula_origen_id,
        theaterId: row.cine_origen_id,
        sessionId: row.sesion_id,
        theaterRoom: row.sala,
        sessionFormat: row.formato_resumen,
        sessionDateTime: `${fechaISO(row.fecha)}T${String(row.horario).slice(0, 5)}:00`,
        sessionDisplayDate: fechaISO(row.fecha_cartelera),
        language: { name: row.idioma },
    };

    const cinemaUrl = row.cine_url;
    if (!cinemaUrl) throw new Error("El cine no tiene URL configurada.");

    const cinemaSlug = new URL(cinemaUrl).pathname
        .split("/")
        .filter(Boolean)
        .at(-1);
    if (!cinemaSlug) throw new Error("No se pudo obtener el slug del cine.");

    return normalizeSessions(
        raw,
        prices,
        {
            id: Number(row.cine_origen_id),
            name: row.cine_nombre,
            slug: cinemaSlug,
            address: "",
            city: "",
        },
        new Date().toISOString(),
        row.pelicula_url_fuente ?? undefined,
    );
}
