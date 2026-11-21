import { ensureCinemark, cinemarkData } from "../../scraper/cinemark/client.ts";
import { normalizarOcupacionCinemark } from "../../scraper/cinemark/normalize.ts";
import type { RawSession } from "../../scraper/cinemark/types.ts";
import { vistaData } from "../../scraper/vista/client.ts";
import type { Session } from "../../scraper/vista/types.ts";
import { consultarButacasCineplanet } from "../../scraper/cineplanet/butacas.ts";
import { consultarButacasCinepolis } from "../../scraper/cinepolis/butacas.ts";
import { consultarButacasVista } from "../../scraper/vista/butacas.ts";
import { normalizarButacas, type Butacas } from "../../scraper/butacas.ts";
import type { CarteleraButacas } from "./types.ts";

/** Ocupacion por cine que publica Cinemark en su cartelera. */
export async function carteleraCinemark(
    cineId: string,
): Promise<CarteleraButacas> {
    await ensureCinemark();
    const sesiones = await cinemarkData<RawSession[]>("/cinema/showtimes", {
        theater: cineId,
    });
    if (!Array.isArray(sesiones)) {
        throw new Error("Cinemark no devolvio su cartelera.");
    }

    const resultado: CarteleraButacas = new Map();
    const consultadasEn = new Date().toISOString();
    for (const sesion of sesiones) {
        if (sesion.theaterId !== cineId) continue;
        resultado.set(`${cineId}:${sesion.sessionId}`, {
            fecha: sesion.sessionDateTime.slice(0, 10),
            horario: sesion.sessionDateTime.slice(11, 16),
            peliculaId: sesion.corporateId,
            butacas: normalizarOcupacionCinemark(
                sesion.occupation,
                consultadasEn,
            ),
        });
    }
    return resultado;
}

/** Disponibilidad de asientos que Vista publica para toda la cadena. */
export async function carteleraVista(
    origen: "muvix" | "cinestar",
): Promise<CarteleraButacas> {
    const sesiones = await vistaData<Session>(origen, "Sessions");

    const resultado: CarteleraButacas = new Map();
    const consultadasEn = new Date().toISOString();
    for (const sesion of sesiones) {
        resultado.set(`${sesion.CinemaId}:${sesion.SessionId}`, {
            fecha: sesion.Showtime.slice(0, 10),
            horario: sesion.Showtime.slice(11, 16),
            // SeatsAvailable no informa la capacidad. No se infiere de otras funciones de la sala.
            butacas: normalizarButacas(
                sesion.SeatsAvailable,
                undefined,
                consultadasEn,
            ),
        });
    }
    return resultado;
}

/**
 * Consulta directa de una funcion en las cadenas que la exponen.
 * Cinemark y las que no tienen consulta directa devuelven undefined y se
 * resuelven desde la cartelera del cine.
 */
export async function consultarButacasSesion(
    origen: string,
    cineOrigenId: string,
    sesionId: string,
): Promise<Butacas | undefined> {
    if (origen === "cineplanet") {
        return consultarButacasCineplanet(cineOrigenId, sesionId);
    }
    if (origen === "cinepolis") {
        return consultarButacasCinepolis(cineOrigenId, sesionId);
    }
    if (origen === "muvix" || origen === "cinestar") {
        return consultarButacasVista(origen, cineOrigenId, sesionId);
    }
    return undefined;
}
