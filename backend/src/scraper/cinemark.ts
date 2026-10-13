import { cinemarkData } from "./client.ts";
import { isDate, localNow, normalizeCinema, normalizeMovie, normalizeSessions, sessionDateTime } from "./normalize.ts";
import type { Incident, RawCinema, RawMovie, RawPriceGroup, RawSession, ScrapedMovie, ScrapeResult } from "./types.ts";

export interface ScrapeOptions {
  desde: string;
  dias: number | null;
  cines: string[];
  limitePorCine: number | null;
}

export async function listCinemas(): Promise<RawCinema[]> {
  const cinemas = await cinemarkData<RawCinema[]>("/cinema/theaters", { limit: String(Number.MAX_SAFE_INTEGER) });
  if (!Array.isArray(cinemas) || !cinemas.length) throw new Error("Cinemark no devolvio cines.");
  if (new Set(cinemas.map((cinema) => String(cinema.id))).size !== cinemas.length) throw new Error("Cinemark devolvio cines duplicados.");
  return cinemas;
}

export async function scrapeCinemark(options: ScrapeOptions): Promise<ScrapeResult> {
  const startedAt = new Date().toISOString();
  const allCinemas = await listCinemas();
  const selected = allCinemas.filter((cinema) => !options.cines.length || options.cines.includes(String(cinema.id)) || options.cines.includes(cinema.slug));
  for (const selector of options.cines) {
    if (!selected.some((cinema) => String(cinema.id) === selector || cinema.slug === selector)) throw new Error(`Cine desconocido: ${selector}. Usa --list-cinemas.`);
  }
  const result: ScrapeResult = {
    peliculas: [], cines: [], funciones: [], incidencias: [],
    meta: {
      origen: "cinemark", version: 1, iniciadoEn: startedAt, completo: false,
      desde: options.desde, dias: options.dias, limitePorCine: options.limitePorCine,
      cinesSeleccionados: selected.length, cinesProcesados: 0, sesionesConsultadas: 0,
      moneda: "CLP", zonaHoraria: "America/Santiago", precioIncluyeServicio: false,
    },
  };
  const until = options.dias === null ? null : new Date(Date.parse(`${options.desde}T00:00:00Z`) + options.dias * 86_400_000).toISOString().slice(0, 10);
  const now = localNow();
  const movies = new Map<string, ScrapedMovie>();
  const failedMovies = new Set<string>();
  const sessionIds = new Set<string>();
  const addIncident = (incident: Incident) => {
    result.incidencias.push(incident);
    console.log(`  Aviso (${incident.etapa}): ${incident.mensaje}`);
  };
  for (const [index, cinema] of selected.entries()) {
    const cinemaId = String(cinema.id);
    console.log(`[${index + 1}/${selected.length}] ${cinema.name}`);
    try {
      const normalizedCinema = normalizeCinema(cinema, startedAt);
      const sessions = await cinemarkData<RawSession[]>("/cinema/showtimes", { theater: cinemaId });
      if (!Array.isArray(sessions)) throw new Error("La cartelera no es una lista.");
      const relevant = sessions.filter((session) => {
        try {
          if (session.theaterId !== cinemaId) throw new Error("La cartelera contiene funciones de otro cine.");
          const { fecha, horario } = sessionDateTime(session);
          const date = session.sessionDisplayDate;
          if (!isDate(date)) throw new Error("Fecha de cartelera invalida.");
          return date >= options.desde && (!until || date < until) && `${fecha}T${horario}:59` >= now;
        } catch (error) {
          addIncident({ cineId: cinemaId, sesionId: session.sessionId, etapa: "funcion", mensaje: message(error) });
          return false;
        }
      }).sort((a, b) => a.sessionDateTime.localeCompare(b.sessionDateTime));
      const limited = options.limitePorCine === null ? relevant : relevant.slice(0, options.limitePorCine);
      result.cines.push(normalizedCinema);
      console.log(`  ${limited.length} sesiones a consultar (${relevant.length} dentro del rango).`);
      for (const [sessionIndex, session] of limited.entries()) {
        const sessionKey = `${cinemaId}:${session.sessionId}`;
        if (sessionIds.has(sessionKey)) continue;
        sessionIds.add(sessionKey);
        result.meta.sesionesConsultadas++;
        if (!movies.has(session.corporateId) && !failedMovies.has(session.corporateId)) {
          try {
            const movie = await cinemarkData<RawMovie>(`/cinema/movie/${encodeURIComponent(session.corporateId)}`);
            if (movie.corporateId !== session.corporateId) throw new Error("La pelicula recibida tiene otro id.");
            const normalizedMovie = normalizeMovie(movie, startedAt);
            result.peliculas.push(normalizedMovie);
            movies.set(session.corporateId, normalizedMovie);
          } catch (error) {
            failedMovies.add(session.corporateId);
            addIncident({ cineId: cinemaId, peliculaId: session.corporateId, etapa: "pelicula", mensaje: message(error) });
          }
        }
        if (!movies.has(session.corporateId)) continue;
        try {
          const prices = await cinemarkData<RawPriceGroup[]>("/get-prices", {
            cinemaId, sessionId: session.sessionId, feature: "0", salesChannelToken: "WWW", memberId: "invited",
          });
          const functions = normalizeSessions(session, prices, cinema, startedAt, movies.get(session.corporateId)?.url);
          if (!functions.length) throw new Error("No se publico una tarifa normal para adulto/general.");
          result.funciones.push(...functions);
        } catch (error) {
          addIncident({ cineId: cinemaId, peliculaId: session.corporateId, sesionId: session.sessionId, etapa: "precio", mensaje: message(error) });
        }
        if ((sessionIndex + 1) % 25 === 0) {
          console.log(`  Consultadas ${sessionIndex + 1}/${limited.length} sesiones.`);
        }
      }
      result.meta.cinesProcesados++;
    } catch (error) {
      addIncident({ cineId: cinemaId, etapa: "cine", mensaje: message(error) });
    }
  }
  result.meta.terminadoEn = new Date().toISOString();
  result.funciones.sort((a, b) => a.cineId.localeCompare(b.cineId) || `${a.fecha}T${a.horario}`.localeCompare(`${b.fecha}T${b.horario}`) || a.formato.localeCompare(b.formato));
  result.meta.completo = result.meta.cinesProcesados === selected.length && result.incidencias.length === 0;
  return result;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
