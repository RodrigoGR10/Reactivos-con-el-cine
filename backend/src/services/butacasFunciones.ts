import { query } from "../db.ts";
import { ensureCinemark, cinemarkData } from "../scraper/cinemark/client.ts";
import type { RawSession } from "../scraper/cinemark/types.ts";
import { vistaData } from "../scraper/vista/client.ts";
import type { Session } from "../scraper/vista/types.ts";
import { consultarButacasCineplanet } from "../scraper/cineplanet/butacas.ts";
import { consultarButacasCinepolis } from "../scraper/cinepolis/butacas.ts";
import { consultarButacasVista } from "../scraper/vista/butacas.ts";
import { normalizarButacas, type Butacas } from "../scraper/butacas.ts";
import { cargarHorario, cargarHorarios } from "./preciosFunciones/horarios.ts";
import type { ScheduleWithPrices } from "./preciosFunciones/types.ts";
import { CACHE_BUTACAS_MS } from "./estadoButacas.ts";
import { localNow } from "../utils/localNow.ts";

interface SesionButacas { fecha: string; horario: string; peliculaId?: string; butacas?: Butacas }
const carteleras = new Map<string, { hasta: number; consulta: Promise<Map<string, SesionButacas>> }>();
const consultas = new Map<string, Promise<ScheduleWithPrices | null>>();

async function carteleraButacas(origen: "cinemark" | "muvix" | "cinestar", cineId: string) {
    const clave = origen === "cinemark" ? `${origen}:${cineId}` : origen;
    const anterior = carteleras.get(clave);
    if (anterior && anterior.hasta > Date.now()) return anterior.consulta;
    const consulta = (async () => {
        const resultado = new Map<string, SesionButacas>();
        if (origen === "cinemark") {
            await ensureCinemark();
            const sesiones = await cinemarkData<RawSession[]>("/cinema/showtimes", { theater: cineId });
            if (!Array.isArray(sesiones)) throw new Error("Cinemark no devolvio su cartelera.");
            const consultadasEn = new Date().toISOString();
            for (const sesion of sesiones) {
                if (sesion.theaterId !== cineId) continue;
                resultado.set(`${cineId}:${sesion.sessionId}`, {
                    fecha: sesion.sessionDateTime.slice(0, 10), horario: sesion.sessionDateTime.slice(11, 16), peliculaId: sesion.corporateId,
                    butacas: normalizarButacas(sesion.occupation?.availableSeats, sesion.occupation?.capacity, consultadasEn),
                });
            }
        } else {
            const sesiones = await vistaData<Session>(origen, "Sessions");
            const consultadasEn = new Date().toISOString();
            for (const sesion of sesiones) {
                resultado.set(`${sesion.CinemaId}:${sesion.SessionId}`, {
                    fecha: sesion.Showtime.slice(0, 10), horario: sesion.Showtime.slice(11, 16),
                    butacas: normalizarButacas(sesion.SeatsAvailable, undefined, consultadasEn),
                });
            }
        }
        return resultado;
    })().catch((error: unknown) => { carteleras.delete(clave); throw error; });
    carteleras.set(clave, { hasta: Date.now() + CACHE_BUTACAS_MS, consulta });
    return consulta;
}

async function actualizarHorario(horario: ScheduleWithPrices): Promise<ScheduleWithPrices | null> {
    const ahora = Date.now();
    if (horario.butacas_revision === horario.revision && horario.butacas_actualizadas_en && new Date(horario.butacas_actualizadas_en).getTime() > ahora - CACHE_BUTACAS_MS) return horario;
    if (horario.butacas_error_revision === horario.revision && horario.butacas_error_hasta && new Date(horario.butacas_error_hasta).getTime() > ahora) return horario;
    const clave = `${horario.id}:${horario.revision}`;
    const pendiente = consultas.get(clave);
    if (pendiente) return pendiente;
    const consulta = (async () => {
        try {
            let butacas: Butacas | undefined;
            const cineId = horario.cine_origen_id;
            if (horario.origen === "cineplanet") {
                butacas = await consultarButacasCineplanet(cineId, horario.sesion_id);
            } else if (horario.origen === "cinepolis") {
                butacas = await consultarButacasCinepolis(cineId, horario.sesion_id);
            } else if (horario.origen === "cinemark" || horario.origen === "muvix" || horario.origen === "cinestar") {
                if (horario.origen !== "cinemark") butacas = await consultarButacasVista(horario.origen, cineId, horario.sesion_id);
                if (!butacas) {
                    const sesiones = await carteleraButacas(horario.origen, cineId);
                    const sesion = sesiones.get(`${cineId}:${horario.sesion_id}`);
                    if (sesion && sesion.fecha === horario.fecha && sesion.horario === String(horario.horario).slice(0, 5) && (!sesion.peliculaId || sesion.peliculaId === horario.pelicula_origen_id)) butacas = sesion.butacas;
                }
            }
            await query(`
                UPDATE horarios SET butacas = $3::jsonb, butacas_revision = revision,
                    butacas_actualizadas_en = $4, butacas_error_hasta = NULL, butacas_error_revision = NULL,
                    agotada = CASE WHEN $3::jsonb IS NOT NULL THEN ($3::jsonb->>'disponibles')::int = 0 ELSE agotada END
                WHERE id = $1 AND revision = $2;
            `, [horario.id, horario.revision, butacas ? JSON.stringify(butacas) : null, new Date(butacas?.consultadasEn ?? Date.now())]);
        } catch (error) {
            console.warn(`No se pudieron consultar butacas de ${horario.origen}, sesion ${horario.sesion_id}:`, error instanceof Error ? error.message : "Error desconocido");
            await query(`
                UPDATE horarios SET butacas_error_hasta = NOW() + INTERVAL '1 minute', butacas_error_revision = revision
                WHERE id = $1 AND revision = $2;
            `, [horario.id, horario.revision]);
        }
        return cargarHorario(horario.id);
    })().finally(() => consultas.delete(clave));
    consultas.set(clave, consulta);
    return consulta;
}

export async function butacasPorCine(peliculaId: string, cineId: string, fecha: string) {
    const horarios = (await cargarHorarios(Number(peliculaId), cineId)).filter(h => h.fecha === fecha);
    const actualizados: Array<ScheduleWithPrices | null> = [];
    let indice = 0;
    // Las consultas solo leen disponibilidad; nunca seleccionan ni reservan asientos.
    await Promise.all(Array.from({ length: Math.min(2, horarios.length) }, async () => {
        while (indice < horarios.length) {
            const posicion = indice++;
            actualizados[posicion] = await actualizarHorario(horarios[posicion]!);
        }
    }));
    const ahora = localNow().slice(0, 16);
    return actualizados.filter((h): h is ScheduleWithPrices => h !== null && `${h.fecha}T${String(h.horario).slice(0, 5)}` >= ahora);
}
