import { request } from "../http.ts";
import { localNow } from "../../utils/localNow.ts";
import { CADENAS, vistaData } from "./client.ts";
import { normalizeCinema, normalizeMovie, normalizeSchedule } from "./normalize.ts";
import type { CadenaVista, Cinema, Movie, Session, SiteGroup, SiteGroupCinemaLink } from "./types.ts";
import type { ScrapeOptions, ScrapeResult, ScrapedMovie, ScrapedSchedule } from "../types.ts";

export async function listCinemas(chain: CadenaVista) {
  const cinemas = (await vistaData<Cinema>(chain, "Cinemas")).filter((cinema) => !cinema.IsGiftStore);
  if (!cinemas.length || new Set(cinemas.map((cinema) => cinema.ID)).size !== cinemas.length) throw new Error(`Listado de cines de ${chain} invalido.`);
  return cinemas;
}

export async function scrapeVista(chain: CadenaVista, options: ScrapeOptions): Promise<ScrapeResult> {
  const startedAt = new Date().toISOString();
  const cinemas = await listCinemas(chain);
  const selected = cinemas.filter((cinema) => !options.cines.length || options.cines.includes(cinema.ID));
  for (const selector of options.cines) if (!selected.some((cinema) => cinema.ID === selector)) throw new Error(`Cine desconocido: ${selector}. Usa --list-cinemas.`);
  const movies = await vistaData<Movie>(chain, "ScheduledFilms");
  const sessions = await vistaData<Session>(chain, "Sessions");
  if (movies.length && !sessions.length) throw new Error(`La cartelera de ${chain} no devolvio sesiones. Se conservan los datos anteriores.`);
  const cities = await vistaData<SiteGroup>(chain, "SiteGroups");
  const links = await vistaData<SiteGroupCinemaLink>(chain, "SiteGroupCinemaLinks");
  if (new Set(movies.map((movie) => movie.ID)).size !== movies.length || new Set(sessions.map((session) => session.ID)).size !== sessions.length) throw new Error(`Cartelera duplicada de ${chain}.`);
  const movieMap = new Map(movies.map((movie) => [`${movie.CinemaId}-${movie.ScheduledFilmId}`, movie]));
  const result: ScrapeResult = {
    peliculas: [], cines: [], funciones: [], horarios: [], incidencias: [],
    meta: {
      origen: chain, version: 1, modo: "cartelera", iniciadoEn: startedAt, completo: false,
      desde: options.desde, dias: options.dias, limitePorCine: options.limitePorCine,
      cinesSeleccionados: selected.length, cinesDisponibles: cinemas.length, cinesProcesados: 0, sesionesConsultadas: 0,
      moneda: "CLP", zonaHoraria: "America/Santiago", precioIncluyeServicio: false,
    },
  };
  const now = localNow().slice(0, 16);
  const until = options.dias === null ? null : new Date(Date.parse(`${options.desde}T00:00:00Z`) + options.dias * 86_400_000).toISOString().slice(0, 10);
  const savedMovies = new Map<string, ScrapedMovie>();
  const failedMovies = new Set<string>();
  const futureMovies = new Set<string>();
  for (const [index, cinema] of selected.entries()) {
    console.log(`[${index + 1}/${selected.length}] ${cinema.Name}`);
    try {
      const cityId = links.find((link) => link.CinemaId === cinema.ID)?.SiteGroupId;
      const city = cinema.City?.trim() || cities.find((city) => city.ID === cityId)?.Name;
      const normalizedCinema = normalizeCinema(chain, cinema, city!, startedAt);
      const schedules: { movie: Movie; schedule: ScrapedSchedule }[] = [];
      for (const session of sessions.filter((session) => session.CinemaId === cinema.ID)) {
        if (!session.AllowTicketSales || !session.SalesChannels?.split(";").includes("WWW")) continue;
        try {
          const movie = movieMap.get(`${cinema.ID}-${session.ScheduledFilmId}`);
          if (!movie) throw new Error("La pelicula de la sesion no aparece en el catalogo.");
          const schedule = normalizeSchedule(chain, session, movie, startedAt);
          if (`${schedule.fecha}T${schedule.horario}` < now) continue;
          futureMovies.add(movie.FilmHOPK);
          if (schedule.fechaCartelera < options.desde || (until && schedule.fechaCartelera >= until)) continue;
          schedules.push({ movie, schedule });
        } catch (error) {
          result.incidencias.push({ etapa: "funcion", cineId: cinema.ID, sesionId: session.SessionId, mensaje: error instanceof Error ? error.message : String(error) });
        }
      }
      schedules.sort((a, b) => `${a.schedule.fecha}T${a.schedule.horario}`.localeCompare(`${b.schedule.fecha}T${b.schedule.horario}`));
      const limited = options.limitePorCine === null ? schedules : schedules.slice(0, options.limitePorCine);
      for (const { movie, schedule } of limited) {
        if (failedMovies.has(movie.FilmHOPK)) continue;
        try {
          if (!savedMovies.has(movie.FilmHOPK)) {
            const response = await request(`${CADENAS[chain].sitio}/Browsing/Movies/Details/h-${encodeURIComponent(movie.FilmHOPK)}`);
            if (!response.ok) throw new Error(`No se pudo leer la ficha: HTTP ${response.status}.`);
            const normalized = normalizeMovie(chain, movie, await response.text(), startedAt);
            savedMovies.set(movie.FilmHOPK, normalized);
            result.peliculas.push(normalized);
          }
          result.horarios!.push(schedule);
          result.meta.sesionesConsultadas++;
        } catch (error) {
          failedMovies.add(movie.FilmHOPK);
          result.incidencias.push({ etapa: "pelicula", cineId: cinema.ID, peliculaId: movie.FilmHOPK, mensaje: error instanceof Error ? error.message : String(error) });
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
