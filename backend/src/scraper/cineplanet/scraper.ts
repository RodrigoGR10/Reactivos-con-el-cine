import { cineplanetData } from "./client.ts";
import { normalizeCinema, normalizeMovie, normalizeSchedule } from "./normalize.ts";
import { isDate } from "../normalize.ts";
import { localNow } from "../../utils/localNow.ts";
import type { Cinema, Movie, Session } from "./types.ts";
import type { ScrapeResult } from "../types.ts";
import type { ScrapeOptions } from "../cinemark.ts";

export async function listCinemas(): Promise<Cinema[]> {
  const result = await cineplanetData<{ cinemas: Cinema[] }>("/api/cache/cinemascache");
  if (!Array.isArray(result.cinemas) || !result.cinemas.length || new Set(result.cinemas.map((cinema) => cinema.ID)).size !== result.cinemas.length) throw new Error("Listado de cines de Cineplanet invalido.");
  return result.cinemas;
}

export async function scrapeCineplanet(options: ScrapeOptions): Promise<ScrapeResult> {
  const startedAt = new Date().toISOString();
  const cinemas = await listCinemas();
  const selected = cinemas.filter((cinema) => !options.cines.length || options.cines.includes(cinema.ID) || options.cines.includes(cinema.formattedCinemaName));
  for (const selector of options.cines) if (!selected.some((cinema) => cinema.ID === selector || cinema.formattedCinemaName === selector)) throw new Error(`Cine desconocido: ${selector}. Usa --list-cinemas.`);
  const movieResponse = await cineplanetData<{ movies: Movie[] }>("/api/cache/moviescache");
  const sessionResponse = await cineplanetData<{ sessions: Session[] }>("/api/cache/sessioncache");
  if (!Array.isArray(movieResponse.movies) || !Array.isArray(sessionResponse.sessions)) throw new Error("Cartelera de Cineplanet invalida.");
  const sessions = new Map(sessionResponse.sessions.map((session) => [session.id, session]));
  if (sessions.size !== sessionResponse.sessions.length || new Set(movieResponse.movies.map((movie) => movie.id)).size !== movieResponse.movies.length) throw new Error("Cineplanet devolvio peliculas u horarios duplicados.");
  const result: ScrapeResult = {
    peliculas: [], cines: [], funciones: [], horarios: [], incidencias: [],
    meta: {
      origen: "cineplanet", version: 1, modo: "cartelera", iniciadoEn: startedAt, completo: false,
      desde: options.desde, dias: options.dias, limitePorCine: options.limitePorCine,
      cinesSeleccionados: selected.length, cinesDisponibles: cinemas.length, cinesProcesados: 0, sesionesConsultadas: 0,
      moneda: "CLP", zonaHoraria: "America/Santiago", precioIncluyeServicio: false,
    },
  };
  const now = localNow().slice(0, 16);
  const until = options.dias === null ? null : new Date(Date.parse(`${options.desde}T00:00:00Z`) + options.dias * 86_400_000).toISOString().slice(0, 10);
  const savedMovies = new Set<string>();
  const futureMovies = new Set<string>();
  for (const [index, cinema] of selected.entries()) {
    console.log(`[${index + 1}/${selected.length}] ${cinema.name}`);
    try {
      const normalizedCinema = normalizeCinema(cinema, startedAt);
      const schedules = new Map<string, ReturnType<typeof normalizeSchedule>>();
      for (const movie of movieResponse.movies) {
        for (const day of movie.cinemas?.find((item) => item.cinemaId === cinema.ID)?.dates ?? []) {
          for (const sessionId of day.sessions) {
            try {
              if (!isDate(day.date.slice(0, 10))) throw new Error("Fecha de cartelera de Cineplanet invalida.");
              const session = sessions.get(sessionId);
              if (!session) throw new Error(`Falta la sesion ${sessionId} en el catalogo de Cineplanet.`);
              const schedule = normalizeSchedule(session, movie, cinema.ID, day.date.slice(0, 10), startedAt);
              if (`${schedule.fecha}T${schedule.horario}` < now) continue;
              futureMovies.add(movie.id);
              if (schedule.fechaCartelera < options.desde || (until && schedule.fechaCartelera >= until)) continue;
              const previous = schedules.get(schedule.origenId);
              if (previous && previous.revision !== schedule.revision) throw new Error("Una sesion de Cineplanet tiene datos contradictorios.");
              schedules.set(schedule.origenId, schedule);
            } catch (error) {
              result.incidencias.push({ etapa: "funcion", cineId: cinema.ID, peliculaId: movie.id, sesionId: sessionId, mensaje: error instanceof Error ? error.message : String(error) });
            }
          }
        }
      }
      const relevant = [...schedules.values()].sort((a, b) => `${a.fecha}T${a.horario}`.localeCompare(`${b.fecha}T${b.horario}`));
      const limited = options.limitePorCine === null ? relevant : relevant.slice(0, options.limitePorCine);
      for (const schedule of limited) {
        const movie = movieResponse.movies.find((movie) => `cineplanet:${movie.id}` === schedule.peliculaId)!;
        try {
          if (!savedMovies.has(movie.id)) {
            result.peliculas.push(normalizeMovie(movie, startedAt));
            savedMovies.add(movie.id);
          }
          result.horarios!.push(schedule);
          result.meta.sesionesConsultadas++;
        } catch (error) {
          result.incidencias.push({ etapa: "pelicula", cineId: cinema.ID, peliculaId: movie.id, mensaje: error instanceof Error ? error.message : String(error) });
        }
      }
      result.cines.push(normalizedCinema);
      result.meta.cinesProcesados++;
      console.log(`  ${limited.length} horarios, sin consultar precios.`);
    } catch (error) {
      result.incidencias.push({ etapa: "cine", cineId: cinema.ID, mensaje: error instanceof Error ? error.message : String(error) });
    }
  }
  result.meta.peliculasConFuncionesFuturas = [...futureMovies].sort();
  result.meta.terminadoEn = new Date().toISOString();
  result.meta.completo = result.meta.cinesProcesados === selected.length && !result.incidencias.length;
  return result;
}
