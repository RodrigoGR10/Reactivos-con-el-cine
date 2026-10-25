import type mongoose from "mongoose";
import HorarioModel, { type Horario } from "../models/horario.ts";
import CineModel from "../models/cine.ts";
import { ensureCinemark, cinemarkData } from "../scraper/cinemark/client.ts";
import type { RawSession } from "../scraper/cinemark/types.ts";
import { vistaData } from "../scraper/vista/client.ts";
import type { Session } from "../scraper/vista/types.ts";
import { consultarButacasCineplanet } from "../scraper/cineplanet/butacas.ts";
import { consultarButacasCinepolis } from "../scraper/cinepolis/butacas.ts";
import { consultarButacasVista } from "../scraper/vista/butacas.ts";
import { localNow } from "../utils/localNow.ts";
import { normalizarButacas, type Butacas } from "../scraper/butacas.ts";
import { horariosVigentes } from "./preciosFunciones.ts";
import { CACHE_BUTACAS_MS } from "./estadoButacas.ts";

type HorarioGuardado = Horario & { _id: mongoose.Types.ObjectId };
interface SesionButacas { fecha: string; horario: string; peliculaId?: string; butacas?: Butacas }
const carteleras = new Map<string, { hasta: number; consulta: Promise<Map<string, SesionButacas>> }>();
const consultas = new Map<string, Promise<HorarioGuardado | null>>();

async function carteleraButacas(origen: "cinemark" | "muvix" | "cinestar", cineId: string) {
  // Cinemark publica la ocupacion por cine. Vista publica disponibles para toda la cadena.
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
          // SeatsAvailable no informa la capacidad. No se infiere de otras funciones de la sala.
          butacas: normalizarButacas(sesion.SeatsAvailable, undefined, consultadasEn),
        });
      }
    }
    return resultado;
  })().catch((error: unknown) => { carteleras.delete(clave); throw error; });
  carteleras.set(clave, { hasta: Date.now() + CACHE_BUTACAS_MS, consulta });
  return consulta;
}

async function actualizarHorario(horario: HorarioGuardado, cineOrigenId: string): Promise<HorarioGuardado | null> {
  const ahora = Date.now();
  if (horario.butacasRevision === horario.revision && (horario.butacasActualizadasEn?.getTime() ?? 0) > ahora - CACHE_BUTACAS_MS) return horario;
  if (horario.butacasErrorRevision === horario.revision && (horario.butacasErrorHasta?.getTime() ?? 0) > ahora) return horario;
  const clave = `${horario._id}:${horario.revision}`;
  const pendiente = consultas.get(clave);
  if (pendiente) return pendiente;
  const consulta = (async () => {
    try {
      let butacas: Butacas | undefined;
      if (horario.origen === "cineplanet") {
        butacas = await consultarButacasCineplanet(cineOrigenId, horario.sesionId);
      } else if (horario.origen === "cinepolis") {
        butacas = await consultarButacasCinepolis(cineOrigenId, horario.sesionId);
      } else if (horario.origen === "cinemark" || horario.origen === "muvix" || horario.origen === "cinestar") {
        if (horario.origen !== "cinemark") butacas = await consultarButacasVista(horario.origen, cineOrigenId, horario.sesionId);
        if (!butacas) {
          const sesiones = await carteleraButacas(horario.origen, cineOrigenId);
          const sesion = sesiones.get(`${cineOrigenId}:${horario.sesionId}`);
          if (sesion && sesion.fecha === horario.fecha && sesion.horario === horario.horario && (!sesion.peliculaId || !horario.peliculaOrigenId || sesion.peliculaId === horario.peliculaOrigenId)) butacas = sesion.butacas;
        }
      }
      await HorarioModel.updateOne({ _id: horario._id, revision: horario.revision }, {
        $set: {
          butacasRevision: horario.revision,
          butacasActualizadasEn: new Date(butacas?.consultadasEn ?? Date.now()),
          ...(butacas ? { butacas, agotada: butacas.disponibles === 0 } : {}),
        },
        $unset: { butacasErrorHasta: 1, butacasErrorRevision: 1, ...(!butacas ? { butacas: 1 } : {}) },
      }, { runValidators: true });
    } catch (error) {
      console.warn(`No se pudieron consultar butacas de ${horario.origen}, sesion ${horario.sesionId}:`, error instanceof Error ? error.message : "Error desconocido");
      await HorarioModel.updateOne({ _id: horario._id, revision: horario.revision }, {
        $set: { butacasErrorHasta: new Date(Date.now() + 60_000), butacasErrorRevision: horario.revision },
      });
    }
    return HorarioModel.findById(horario._id).lean();
  })().finally(() => consultas.delete(clave));
  consultas.set(clave, consulta);
  return consulta;
}

export async function butacasPorCine(peliculaId: string, cineId: string, fecha: string) {
  const horarios = await HorarioModel.find({ peliculaId, cineId, fecha, ...horariosVigentes() }).sort({ horario: 1 }).lean();
  if (!horarios.length) return [];
  const cine = await CineModel.findById(cineId).lean();
  if (!cine?.origenId || horarios.some(h => h.origen !== cine.origen)) throw new Error("Actualiza la cartelera: la identidad del cine esta incompleta.");
  const actualizados: Array<HorarioGuardado | null> = [];
  // Limita las consultas por funcion; nunca se seleccionan entradas ni se reservan butacas.
  let indice = 0;
  await Promise.all(Array.from({ length: Math.min(2, horarios.length) }, async () => {
    while (indice < horarios.length) {
      const posicion = indice++;
      actualizados[posicion] = await actualizarHorario(horarios[posicion]!, cine.origenId!);
    }
  }));
  const ahora = localNow().slice(0, 16);
  return actualizados.filter((horario): horario is HorarioGuardado => horario !== null && `${horario.fecha}T${horario.horario}` >= ahora);
}
