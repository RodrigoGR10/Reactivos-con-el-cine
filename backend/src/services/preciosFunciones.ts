import { randomUUID } from "node:crypto";
import type mongoose from "mongoose";
import HorarioModel, { type Horario } from "../models/horario.ts";
import PeliculaModel from "../models/pelicula.ts";
import CineModel from "../models/cine.ts";
import { cinemarkData, ensureCinemark } from "../scraper/cinemark/client.ts";
import { normalizeSessions } from "../scraper/cinemark/normalize.ts";
import { localNow } from "../utils/localNow.ts";
import { pricesForSchedule } from "../scraper/cineplanet/normalize.ts";
import { pricesForSchedule as vistaPrices } from "../scraper/vista/normalize.ts";
import { pricesForSchedule as cinepolisPrices } from "../scraper/cinepolis/prices.ts";
import { ORIGENES } from "../scraper/types.ts";
import type { RawPriceGroup, RawSession } from "../scraper/cinemark/types.ts";
import type { ScrapedSession } from "../scraper/types.ts";
import { butacasPublicas } from "./estadoButacas.ts";

export const CACHE_PRECIOS_MS = 15 * 60_000;
const RETRY_MS = 60_000;
type HorarioGuardado = Horario & { _id: mongoose.Types.ObjectId };
const consultas = new Map<string, Promise<HorarioGuardado | null>>();

export function horariosVigentes() {
  const ahora = localNow();
  const fecha = ahora.slice(0, 10);
  return { $or: [{ fecha: { $gt: fecha } }, { fecha, horario: { $gte: ahora.slice(11, 16) } }] };
}

export function horarioPublico(schedule: HorarioGuardado) {
  const consultado = schedule.preciosConsultadosEn?.getTime() ?? 0;
  const compatible = schedule.preciosRevision === schedule.revision && consultado > 0;
  const fresh = compatible && Date.now() - consultado < CACHE_PRECIOS_MS;
  const tarifas = compatible ? schedule.tarifas : [];
  const estadoPrecio = schedule.agotada ? "agotada"
    : fresh ? (tarifas.length ? "disponible" : "sin_tarifa")
    : schedule.consultaPreciosRevision === schedule.revision && (schedule.consultaPreciosHasta?.getTime() ?? 0) > Date.now() ? "consultando"
    : schedule.preciosErrorRevision === schedule.revision && (schedule.preciosErrorHasta?.getTime() ?? 0) > Date.now() ? "error"
    : tarifas.length ? "desactualizado" : "pendiente";

  return {
    id: schedule._id.toString(),
    peliculaId: schedule.peliculaId.toString(), cineId: schedule.cineId.toString(),
    fecha: schedule.fecha, fechaCartelera: schedule.fechaCartelera,
    horario: schedule.horario, formatoResumen: schedule.formatoResumen, idioma: schedule.idioma, sala: schedule.sala,
    agotada: schedule.agotada, estadoPrecio,
    ...butacasPublicas(schedule),
    preciosConsultadosEn: compatible ? schedule.preciosConsultadosEn?.toISOString() : undefined,
    reintentarEn: schedule.preciosErrorRevision === schedule.revision ? schedule.preciosErrorHasta?.toISOString() : undefined,
    urlCompra: schedule.urlCompra ?? schedule.peliculaUrl,
    tarifas: tarifas.map((tarifa) => ({
      ...tarifa, peliculaId: schedule.peliculaId.toString(),
      cineId: schedule.cineId.toString(), agotada: schedule.agotada,
      urlCompra: schedule.origen === "cineplanet" ? tarifa.urlCompra.replace(/\/entradas$/, "/asientos") : tarifa.urlCompra,
    })),
  };
}

async function consultarHorario(schedule: HorarioGuardado, movieId: string, movieUrl: string | undefined, cinemaId: string, cinemaName: string, cinemaSlug: string) {
  const ahora = new Date();
  if (schedule.agotada || (schedule.preciosRevision === schedule.revision && (schedule.preciosConsultadosEn?.getTime() ?? 0) > ahora.getTime() - CACHE_PRECIOS_MS)) return schedule;
  if (schedule.preciosErrorRevision === schedule.revision && (schedule.preciosErrorHasta?.getTime() ?? 0) > ahora.getTime()) return schedule;
  const key = `${schedule._id}:${schedule.revision}`;
  const existing = consultas.get(key);
  if (existing) return existing;

  const task = (async () => {
    const token = randomUUID();
    const claimed = await HorarioModel.findOneAndUpdate({
      _id: schedule._id, revision: schedule.revision,
      $and: [
        { $or: [{ preciosRevision: { $ne: schedule.revision } }, { preciosConsultadosEn: { $lte: new Date(ahora.getTime() - CACHE_PRECIOS_MS) } }, { preciosConsultadosEn: { $exists: false } }] },
        { $or: [{ consultaPreciosRevision: { $ne: schedule.revision } }, { consultaPreciosHasta: { $exists: false } }, { consultaPreciosHasta: { $lte: ahora } }] },
        { $or: [{ preciosErrorRevision: { $ne: schedule.revision } }, { preciosErrorHasta: { $exists: false } }, { preciosErrorHasta: { $lte: ahora } }] },
      ],
    }, { $set: { consultaPreciosToken: token, consultaPreciosRevision: schedule.revision, consultaPreciosHasta: new Date(ahora.getTime() + 5 * 60_000) } }, { returnDocument: "after" }).lean();

    if (!claimed) return HorarioModel.findById(schedule._id).lean();
    try {
      let tarifas: ScrapedSession[];
      if (schedule.origen === "cineplanet") {
        tarifas = await pricesForSchedule({
          ...schedule, id: `cineplanet:${schedule.origenId}`,
          peliculaId: `cineplanet:${movieId}`, cineId: `cineplanet:${cinemaId}`,
        });
      } else if (schedule.origen === "muvix" || schedule.origen === "cinestar") {
        tarifas = await vistaPrices(schedule.origen, {
          ...schedule, id: `${schedule.origen}:${schedule.origenId}`,
          peliculaId: `${schedule.origen}:${movieId}`, cineId: `${schedule.origen}:${cinemaId}`,
        });
      } else if (schedule.origen === "cinepolis") {
        tarifas = await cinepolisPrices({
          ...schedule, id: `cinepolis:${schedule.origenId}`,
          peliculaId: `cinepolis:${movieId}`, cineId: `cinepolis:${cinemaId}`,
        });
      } else {
        await ensureCinemark();
        const prices = await cinemarkData<RawPriceGroup[]>("/get-prices", {
          cinemaId, sessionId: schedule.sesionId, feature: "0",
          salesChannelToken: "WWW", memberId: "invited",
        });
        const raw: RawSession = {
          corporateId: movieId, theaterId: cinemaId, sessionId: schedule.sesionId,
          theaterRoom: schedule.sala, sessionFormat: schedule.formatoResumen,
          sessionDateTime: `${schedule.fecha}T${schedule.horario}:00`,
          sessionDisplayDate: schedule.fechaCartelera,
          language: { name: schedule.idioma },
        };
        tarifas = normalizeSessions(raw, prices, { id: Number(cinemaId), name: cinemaName, slug: cinemaSlug, address: "", city: "" }, new Date().toISOString(), movieUrl);
      }
      await new HorarioModel({ ...schedule, tarifas }).validate();
      await HorarioModel.updateOne({ _id: schedule._id, revision: schedule.revision, consultaPreciosToken: token }, {
        $set: {
          tarifas, preciosRevision: schedule.revision, preciosConsultadosEn: new Date(),
          ...(schedule.origen === "cinepolis" && tarifas[0] ? { urlCompra: tarifas[0].urlCompra } : {}),
        },
        $unset: { preciosErrorHasta: 1, preciosErrorRevision: 1 },
      }, { runValidators: true });
    } catch (error) {
      console.warn(`No se pudieron consultar precios de la sesion ${schedule.sesionId}:`, error instanceof Error ? error.message : "Error desconocido");
      await HorarioModel.updateOne({ _id: schedule._id, revision: schedule.revision, consultaPreciosToken: token }, {
        $set: { preciosErrorHasta: new Date(Date.now() + RETRY_MS), preciosErrorRevision: schedule.revision },
      });
    } finally {
      await HorarioModel.updateOne({ _id: schedule._id, consultaPreciosToken: token }, {
        $unset: { consultaPreciosToken: 1, consultaPreciosHasta: 1, consultaPreciosRevision: 1 },
      });
    }
    return HorarioModel.findById(schedule._id).lean();
  })().finally(() => { consultas.delete(key); });
  consultas.set(key, task);
  return task;
}

export async function preciosPorCine(peliculaId: string, cineId: string, fecha: string) {
  const schedules = await HorarioModel.find({ peliculaId, cineId, fecha, ...horariosVigentes() }).sort({ horario: 1 }).lean();
  if (!schedules.length) return [];
  const [movie, cinema] = await Promise.all([PeliculaModel.findById(peliculaId).lean(), CineModel.findById(cineId).lean()]);
  if (!movie || !cinema?.origenId || !cinema.url || !ORIGENES.some((origin) => origin === cinema.origen) || schedules.some((schedule) => schedule.origen !== cinema.origen || (!schedule.peliculaOrigenId && movie.origen !== schedule.origen))) throw new Error("Los datos del cine o pelicula estan incompletos. Actualiza la cartelera.");
  const cinemaSlug = new URL(cinema.url).pathname.split("/").filter(Boolean).at(-1)!;
  const updated = await Promise.all(schedules.map((schedule) => consultarHorario(schedule, schedule.peliculaOrigenId ?? movie.origenId!, schedule.peliculaUrl ?? movie.url, cinema.origenId!, cinema.nombre, cinemaSlug)));
  const now = localNow().slice(0, 16);
  return updated.filter((schedule) => schedule && `${schedule.fecha}T${schedule.horario}` >= now).map((schedule) => horarioPublico(schedule!));
}
