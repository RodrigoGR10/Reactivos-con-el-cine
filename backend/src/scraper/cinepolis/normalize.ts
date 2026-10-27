import { fechaDeEstreno, scheduleRevision } from "../normalize.ts";
import { normalizarSinopsis } from "../../utils/sinopsis.ts";
import { normalizarComuna } from "../../utils/comunas.ts";
import { SITE } from "./client.ts";
import type { ScrapedCinema, ScrapedMovie, ScrapedSchedule } from "../types.ts";
import type {
  CinepolisCinema,
  CinepolisMovie,
  CinepolisShowtime,
  FormatoFuente,
  Proyeccion,
} from "./types.ts";

/** Campos adicionales opcionales; los campos originales se mantienen intactos. */
export type CinepolisCinemaFull = ScrapedCinema & {
  vistaId: string;
};

export type CinepolisMovieFull = ScrapedMovie & {
  tituloOriginal?: string;
  clasificacionDescripcion?: string;
  datosIncompletos: boolean;
};

export type CinepolisScheduleFull = ScrapedSchedule & {
  proyeccion: Proyeccion;
  experiencia: string | null;
  formatoFuente: FormatoFuente;
  formatoOriginal: string | null;
  experienciaOriginal: string | null;
  idiomaOriginal: string | null;
  numeroSala: string | null;
  disponibilidad: string | null;
  fechaHora: string | null;
  vistaCinemaId: string | null;
  vistaMovieId: string | null;
};

function text(value: string, field: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`Falta ${field} en Cinépolis.`);
  return value.trim();
}

export function normalizeCinema(cinema: CinepolisCinema, extractedAt: string): CinepolisCinemaFull {
  const id = text(cinema.id, "id de cine");
  const coordenadas = {
    ...(Number.isFinite(cinema.latitude) ? { latitud: cinema.latitude } : {}),
    ...(Number.isFinite(cinema.longitude) ? { longitud: cinema.longitude } : {}),
  };
  return {
    id: `cinepolis:${id}`,
    origen: "cinepolis",
    origenId: id,
    extraidoEn: extractedAt,
    nombre: text(cinema.name, "nombre de cine"),
    comuna: normalizarComuna(text(cinema.comuna, "comuna")),
    ciudad: text(cinema.city, "ciudad"),
    direccion: text(cinema.address, "direccion"),
    url: `${SITE}/horarios?cinema=${encodeURIComponent(text(cinema.slug, "slug de cine"))}`,
    logo: "/cinepolis.png",
    vistaId: text(cinema.vistaId, "vistaId"),
    ...coordenadas,
  };
}

export function normalizeMovie(movie: CinepolisMovie, extractedAt: string): CinepolisMovieFull {
  const id = text(movie.id, "id de pelicula");
  if (!Number.isInteger(movie.runTime) || movie.runTime <= 0) {
    throw new Error(`Duración de Cinépolis inválida para ${movie.id}.`);
  }
  return {
    id: `cinepolis:${id}`,
    origen: "cinepolis",
    origenId: id,
    extraidoEn: extractedAt,
    titulo: text(movie.title, "titulo"),
    tituloOriginal: movie.originalTitle?.trim() || undefined,
    duracion: movie.runTime,
    estadoEstreno: "cartelera",
    fechaEstreno: fechaDeEstreno(movie.releaseDate),
    genero: text(movie.genre || "General", "genero"),
    clasificacion: text(movie.rating || "TE", "clasificacion"),
    clasificacionDescripcion: movie.ratingDescription,
    sinopsis: normalizarSinopsis(movie.synopsis),
    poster: text(movie.poster, "poster"),
    url: `${SITE}/detalle?movie=${encodeURIComponent(text(movie.slug, "slug de pelicula"))}`,
    datosIncompletos: movie.datosIncompletos ?? false,
  };
}

export function normalizeSchedule(
  showtime: CinepolisShowtime,
  movie: CinepolisMovie,
  cinema: CinepolisCinema,
  extractedAt: string,
): CinepolisScheduleFull {
  const sourceId = `${cinema.id}:${showtime.sessionId}`;
  const schedule = {
    id: `cinepolis:${sourceId}`,
    origen: "cinepolis" as const,
    origenId: sourceId,
    extraidoEn: extractedAt,
    peliculaId: `cinepolis:${movie.id}`,
    cineId: `cinepolis:${cinema.id}`,
    sesionId: showtime.sessionId,
    fecha: showtime.date,
    fechaCartelera: showtime.date,
    horario: showtime.time,
    formatoResumen: showtime.format,
    idioma: showtime.language,
    sala: showtime.screen,
    agotada: showtime.agotada,
    urlCompra: showtime.purchaseUrl,
    proyeccion: showtime.projection,
    experiencia: showtime.experience,
    formatoFuente: showtime.formatSource,
    formatoOriginal: showtime.rawFormat,
    experienciaOriginal: showtime.rawExperience,
    idiomaOriginal: showtime.rawLanguage,
    numeroSala: showtime.screenNumber,
    disponibilidad: showtime.availability,
    fechaHora: showtime.datetime,
    vistaCinemaId: showtime.vistaCinemaId,
    vistaMovieId: showtime.vistaMovieId,
  };
  return { ...schedule, revision: scheduleRevision(schedule) };
}
