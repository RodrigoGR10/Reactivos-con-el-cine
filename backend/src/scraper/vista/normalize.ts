import { load } from "cheerio";
import { fechaDeEstreno, isDate, scheduleRevision } from "../normalize.ts";
import { normalizarSinopsis } from "../../utils/sinopsis.ts";
import { CADENAS, purchaseUrl, ticketPage } from "./client.ts";
import type { ScrapedCinema, ScrapedMovie, ScrapedSchedule, ScrapedSession } from "../types.ts";
import type { CadenaVista, Cinema, Movie, Session } from "./types.ts";

function text(value: string, field: string) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`Falta ${field} en la cartelera.`);
  return value.trim();
}

export function normalizeCinema(chain: CadenaVista, cinema: Cinema, city: string, extractedAt: string): ScrapedCinema {
  const id = text(cinema.ID, "id de cine");
  const site = CADENAS[chain].sitio;
  return {
    id: `${chain}:${id}`, origen: chain, origenId: id, extraidoEn: extractedAt,
    nombre: text(cinema.Name, "nombre de cine"), ciudad: text(city, "ciudad"), comuna: city,
    direccion: text([cinema.Address1, cinema.Address2].filter(Boolean).join(", "), "direccion"),
    url: `${site}/Browsing/Cinemas/Details/${encodeURIComponent(id)}`, logo: new URL(CADENAS[chain].logo, site).href,
    ...(cinema.Latitude && Number.isFinite(Number(cinema.Latitude)) ? { latitud: Number(cinema.Latitude) } : {}),
    ...(cinema.Longitude && Number.isFinite(Number(cinema.Longitude)) ? { longitud: Number(cinema.Longitude) } : {}),
  };
}

export function normalizeMovie(chain: CadenaVista, movie: Movie, html: string, extractedAt: string): ScrapedMovie {
  const id = text(movie.FilmHOPK, "id de pelicula");
  const doc = load(html);
  const title = doc(".header-movie-info .movie-title").text().trim();
  if (title !== movie.Title.trim()) throw new Error("La ficha de pelicula no coincide con la cartelera.");
  const duration = Number(movie.RunTime);
  if (!Number.isSafeInteger(duration) || duration <= 0) throw new Error("Duracion de pelicula invalida.");
  const site = CADENAS[chain].sitio;
  return {
    id: `${chain}:${id}`, origen: chain, origenId: id, extraidoEn: extractedAt,
    titulo: text(movie.Title, "titulo"), duracion: duration,
    fechaEstreno: fechaDeEstreno(movie.NationalOpeningDate) ?? fechaDeEstreno(movie.OpeningDate),
    genero: text(doc(".header-movie-info .mayus").text(), "genero"), clasificacion: text(movie.Rating, "clasificacion"),
    sinopsis: normalizarSinopsis(movie.Synopsis),
    poster: `${site}/CDN/media/entity/get/FilmPosterGraphic/${encodeURIComponent(id)}?referenceScheme=HeadOffice&allowPlaceHolder=true`,
    url: `${site}/Browsing/Movies/Details/h-${encodeURIComponent(id)}`,
  };
}

export function normalizeSchedule(chain: CadenaVista, session: Session, movie: Movie, extractedAt: string): ScrapedSchedule {
  if (session.ID !== `${session.CinemaId}-${session.SessionId}` || session.CinemaId !== movie.CinemaId || session.ScheduledFilmId !== movie.ScheduledFilmId || !/^\d+$/.test(session.SessionId)) throw new Error("La sesion no coincide con la pelicula o cine.");
  if (!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(session.Showtime) || !isDate(session.Showtime.slice(0, 10)) || !isDate(session.SessionBusinessDate.slice(0, 10))) throw new Error("Fecha u hora de funcion invalida.");
  const attributes = session.SessionAttributesNames;
  if (!Array.isArray(attributes) || !attributes.length) throw new Error("Faltan los atributos de la funcion.");
  const languages = attributes.filter((value) => ["DOB", "SUB", "ESP", "VO"].includes(value));
  if (languages.length !== 1) throw new Error("Idioma de funcion desconocido o ambiguo.");
  const formato = attributes.filter((value) => !["DOB", "SUB", "ESP", "VO", "RES", "TRADICIONA", "TRADICIONAL"].includes(value));
  if (!formato.some((value) => /^(2D|3D)$/.test(value))) throw new Error("Falta el formato de proyeccion.");
  if (!Number.isSafeInteger(session.SeatsAvailable) || session.SeatsAvailable < 0) throw new Error("Disponibilidad de funcion invalida.");
  const sourceId = `${session.CinemaId}:${session.SessionId}`;
  const schedule = {
    id: `${chain}:${sourceId}`, origen: chain, origenId: sourceId, extraidoEn: extractedAt,
    peliculaId: `${chain}:${movie.FilmHOPK}`, cineId: `${chain}:${session.CinemaId}`, sesionId: session.SessionId,
    fecha: session.Showtime.slice(0, 10), horario: session.Showtime.slice(11, 16), fechaCartelera: session.SessionBusinessDate.slice(0, 10),
    idioma: ["DOB", "ESP"].includes(languages[0]) ? "Doblada" : languages[0] === "SUB" ? "Subtitulada" : "Version original",
    formatoResumen: formato.sort((a, b) => Number(!/^[23]D$/.test(a)) - Number(!/^[23]D$/.test(b))).join(" "),
    sala: "", agotada: session.SeatsAvailable === 0,
    urlCompra: purchaseUrl(chain, session.CinemaId, session.SessionId),
  };
  return { ...schedule, revision: scheduleRevision(schedule) };
}

export function normalizePrices(chain: CadenaVista, html: string, schedule: ScrapedSchedule): ScrapedSession[] {
  const doc = load(html);
  const action = doc("#frmSelectTickets").attr("action");
  if (!action) throw new Error("El sitio no devolvio la seleccion de entradas.");
  const url = new URL(action, `${CADENAS[chain].sitio}/Ticketing/visSelectTickets.aspx`);
  const cinemaId = schedule.cineId.slice(chain.length + 1);
  if (url.searchParams.get("cinemacode") !== cinemaId || url.searchParams.get("txtSessionId") !== schedule.sesionId) throw new Error("Las tarifas corresponden a otra funcion.");
  if (!doc("#standard").length) throw new Error("El sitio no devolvio la lista de entradas normales.");
  const service = doc(".disclaimer-show").text().match(/cargo\s+por\s+servicio\s+de\s*\$\s*([\d.]+)\s+por\s+entrada/i);
  if (!service) throw new Error("El sitio no informo el cargo de servicio por entrada.");
  const bookingFee = Number(service[1].replaceAll(".", ""));
  const result: ScrapedSession[] = [];
  const seen = new Set<string>();
  for (const element of doc("#standard li.item").toArray()) {
    const row = doc(element);
    const title = row.find(".ticket-description").text().trim();
    const normalized = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    if (!/\b(?:GENERAL|ADULTO)\b/.test(normalized) || /PROMO|SOCIO|PACK|COMBO|CONVENIO|DESCUENTO|NINO|EDAD|ESTUDIANTE|CUPON|2X1|BANCO/.test(normalized)) continue;
    const input = row.find("input.quantity");
    if (input.attr("data-loyalty-recognition-id") || input.is(":disabled")) continue;
    const price = row.find(".price");
    const original = price.attr("data-original");
    const fee = price.attr("data-ticket-fee-in-cents");
    if (!original || !fee || !/^\d+$/.test(original) || !/^\d+$/.test(fee)) throw new Error("Falta el precio o cargo de una tarifa normal.");
    const cents = Number(original);
    const feeCents = Number(fee);
    if (!Number.isSafeInteger(cents) || cents <= 0 || cents % 100 !== 0 || !Number.isSafeInteger(feeCents) || feeCents % 100 !== 0 || !Number.isSafeInteger(bookingFee) || bookingFee < 0) throw new Error("Tarifa de entrada invalida.");
    const ticketId = text(input.attr("id")!, "id de tarifa");
    if (seen.has(ticketId)) throw new Error("Tarifa duplicada en la misma funcion.");
    seen.add(ticketId);
    const sourceId = `${schedule.origenId}:${ticketId}`;
    const cargoServicio = bookingFee + feeCents / 100;
    result.push({
      id: `${chain}:${sourceId}`, origen: chain, origenId: sourceId, extraidoEn: new Date().toISOString(),
      peliculaId: schedule.peliculaId, cineId: schedule.cineId, fecha: schedule.fecha, fechaCartelera: schedule.fechaCartelera,
      horario: schedule.horario, formato: schedule.formatoResumen, idioma: schedule.idioma, sala: "",
      precio: cents / 100, cargoServicio, precioOnline: cents / 100 + cargoServicio,
      tipoEntrada: title, urlCompra: purchaseUrl(chain, cinemaId, schedule.sesionId), agotada: schedule.agotada,
    });
  }
  return result;
}

export async function pricesForSchedule(chain: CadenaVista, schedule: ScrapedSchedule) {
  const html = await ticketPage(chain, schedule.cineId.slice(chain.length + 1), schedule.sesionId);
  return normalizePrices(chain, html, schedule);
}
