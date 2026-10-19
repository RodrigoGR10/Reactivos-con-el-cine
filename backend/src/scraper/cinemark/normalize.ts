import { SITE } from "./client.ts";
import { normalizarSinopsis } from "../../utils/sinopsis.ts";
import { fechaDeEstreno, isDate, scheduleRevision } from "../normalize.ts";
import type { RawCinema, RawMovie, RawPriceGroup, RawSession, RawTicket } from "./types.ts";
import type { ScrapedCinema, ScrapedMovie, ScrapedSchedule, ScrapedSession } from "../types.ts";

const text = (value: string, field: string): string => {
  if (typeof value !== "string" || !value.trim()) throw new Error(`Falta ${field}.`);
  return value.trim();
};
const normalized = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();

const comunaBySlug: Record<string, string> = {
  "cinemark-gran-avenida": "San Miguel",
  "cinemark-la-dehesa": "Lo Barnechea",
};

export function normalizeCinema(cinema: RawCinema, extractedAt: string): ScrapedCinema {
  if (!Number.isSafeInteger(cinema.id) || cinema.id < 1) throw new Error("Id de cine invalido.");
  const address = text(cinema.address, "direccion del cine");
  const lastPart = address.split(",").at(-1)?.trim();
  const comuna = comunaBySlug[cinema.slug] ?? (lastPart && !/\d/.test(lastPart) ? lastPart : cinema.city);
  const coordinate = (value: string | undefined) => value?.trim() && Number.isFinite(Number(value)) ? Number(value) : undefined;
  return {
    id: `cinemark:${cinema.id}`,
    origen: "cinemark",
    origenId: String(cinema.id),
    extraidoEn: extractedAt,
    nombre: text(cinema.name, "nombre del cine"),
    comuna: text(comuna, "comuna del cine"),
    ciudad: text(cinema.city, "ciudad del cine"),
    direccion: address,
    logo: "/cinemark.png",
    url: `${SITE}/cartelera/${encodeURIComponent(text(cinema.slug, "slug del cine"))}`,
    latitud: coordinate(cinema.latitude),
    longitud: coordinate(cinema.longitude),
  };
}

export function normalizeMovie(movie: RawMovie, extractedAt: string): ScrapedMovie {
  if (!Number.isInteger(movie.runTime) || movie.runTime <= 0) throw new Error("Duracion de pelicula invalida.");
  return {
    id: `cinemark:${text(movie.corporateId, "id de pelicula")}`,
    origen: "cinemark",
    origenId: movie.corporateId,
    extraidoEn: extractedAt,
    titulo: text(movie.title, "titulo"),
    estadoEstreno: movie.status === "PRESALE" ? "preventa" : undefined,
    fechaEstreno: fechaDeEstreno(movie.openingDate),
    duracion: movie.runTime,
    genero: text(movie.genres?.map((genre) => genre.name).join(", "), "genero"),
    clasificacion: text(movie.rating, "clasificacion"),
    sinopsis: normalizarSinopsis(movie.synopsis),
    poster: text(movie.posterUrl, "poster"),
    url: `${SITE}/pelicula/${encodeURIComponent(text(movie.slug, "slug de pelicula"))}`,
  };
}

export function sessionDateTime(session: RawSession): { fecha: string; horario: string } {
  const match = /^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):([0-5]\d):/.exec(session.sessionDateTime);
  if (!match || !isDate(match[1])) throw new Error("Fecha u hora de funcion invalida.");
  return { fecha: match[1], horario: `${match[2]}:${match[3]}` };
}

export function normalizeSchedule(session: RawSession, extractedAt: string): ScrapedSchedule {
  const { fecha, horario } = sessionDateTime(session);
  if (!isDate(session.sessionDisplayDate)) throw new Error("Fecha de cartelera invalida.");
  const cinemaId = text(session.theaterId, "id de cine");
  const sessionId = text(session.sessionId, "id de sesion");
  const sourceId = `${cinemaId}:${sessionId}`;
  const schedule = {
    id: `cinemark:${sourceId}`, origen: "cinemark" as const,
    origenId: sourceId, extraidoEn: extractedAt,
    peliculaId: `cinemark:${text(session.corporateId, "id de pelicula")}`,
    cineId: `cinemark:${cinemaId}`, sesionId: sessionId,
    fecha, horario, fechaCartelera: session.sessionDisplayDate,
    formatoResumen: text(session.sessionFormat, "formato de sesion"),
    idioma: text(session.language?.name, "idioma"),
    sala: text(session.theaterRoom, "sala"),
    agotada: session.occupation?.availableSeats === 0,
  };
  return { ...schedule, revision: scheduleRevision(schedule) };
}

export function ticketFormat(
  sessionFormat: string,
  ticketTitle: string,
): string {
  const session = normalized(sessionFormat).replace(
    /\bINFINITY[ -]+VISION\b/g,
    "IV",
  );

  const title = normalized(text(ticketTitle, "tipo de entrada"))
    .replace(/\bD[ -]?BOX\b/g, "DBOX")
    .replace(/\bPRE\b/g, "PREMIER")
    .replace(/\bINFINITY[ -]+VISION\b/g, "IV");

  const formats: string[] =
    title.match(/\b(?:2D|3D|4D|XD|DBOX|IMAX|PREMIER|PALCO|PLAY|IV)\b/g) ?? [];

  const dimensions = [
    ...new Set(formats.filter((format) => /^[23]D$/.test(format))),
  ];

  if (dimensions.length > 1) {
    throw new Error("La tarifa contiene dimensiones incompatibles.");
  }

  const projection = dimensions[0] ?? session.match(/\b[23]D\b/)?.[0];

  if (!projection) {
    throw new Error("La tarifa no indica una proyeccion 2D o 3D.");
  }

  if (/\bIV\b/.test(session)) {
    formats.push("IV");
  }

  return [...new Set([projection, ...formats])]
    .map((format) => (format === "IV" ? "INFINITY VISION" : format))
    .join(" ");
}

export function normalizePrices(groups: RawPriceGroup[], session: RawSession): {
  areaId: string; formato: string; precio: number; precioOnline: number; cargoServicio: number; tipoEntrada: string;
}[] {
  if (!Array.isArray(groups)) throw new Error("La respuesta de precios no es una lista.");
  const byArea = new Map<string, { ticket: RawTicket; option: RawTicket["buyOptions"][number]; rank: number }>();
  for (const group of groups) {
    if (normalized(group.title) !== "GENERAL") continue;
    if (!Array.isArray(group.tickets)) throw new Error("Grupo de tarifas invalido.");
    for (const ticket of group.tickets) {
      const title = normalized(ticket.title);
      const rank = /^ADULTO\b/.test(title) ? 3 : /^(MATINE|LUNES|MARTES|MIERCOLES|JUEVES|VIERNES|SABADO|DOMINGO)\b/.test(title) ? 2 : /^(GENERAL|NORMAL|ENTRADA (GENERAL|UNICA)|TARIFA NORMAL)\b/.test(title) ? 1 : 0;
      if (/\b(NINO|NINA|3ERA|TERCERA|ESTUDIANTE|PROMO|CANJE)\b/.test(title)) continue;
      if (!rank || ticket.isPackageTicket || ticket.isBinPromotion || ticket.isThirdPartyMemberTicket || ticket.isPaymentByCreditCardOnly || ticket.partnershipName || ticket.recognitionId || (ticket.ticketsQty ?? 1) !== 1) continue;
      if (ticket.internalTicketType && normalized(ticket.internalTicketType) !== "GENERAL") continue;
      const options = ticket.buyOptions?.filter((option) => !option.promoId && !option.recogId && !option.level && !option.type && Number.isFinite(option.priceInCents) && option.priceInCents > 0 && Number.isFinite(option.totalWithFee) && option.totalWithFee >= option.priceInCents);
      if (!options?.length) continue;
      const option = options[0];
      const area = text(ticket.areaCategoryCode, "area de tarifa");
      const previous = byArea.get(area);
      if (!previous || rank > previous.rank) byArea.set(area, { ticket, option, rank });
      else if (rank === previous.rank && (option.priceInCents !== previous.option.priceInCents || option.totalWithFee !== previous.option.totalWithFee)) throw new Error(`Tarifas normales ambiguas para area ${area}.`);
    }
  }
  return [...byArea].map(([areaId, { ticket, option }]) => {
    const precio = option.priceInCents / 100;
    const precioOnline = option.totalWithFee / 100;
    if (!Number.isInteger(precio) || !Number.isInteger(precioOnline)) throw new Error("Tarifa CLP con unidades inesperadas.");
    return { areaId, formato: ticketFormat(session.sessionFormat, ticket.title), precio, precioOnline, cargoServicio: precioOnline - precio, tipoEntrada: ticket.title.trim() };
  });
}

export function purchaseUrl(movieUrl: string | undefined, cinema: Pick<RawCinema, "name" | "slug">, date: string, language: string, format: string): string {
  if (!isDate(date)) throw new Error("Fecha de enlace invalida.");
  const url = new URL(movieUrl ?? `/cartelera/${encodeURIComponent(cinema.slug)}`, SITE);
  if (url.protocol !== "https:" || url.hostname !== "www.cinemark.cl" || url.username || url.password) throw new Error("Enlace de Cinemark invalido.");
  if (movieUrl && !/^\/pelicula\/[^/]+$/.test(url.pathname)) throw new Error("Enlace de pelicula invalido.");
  url.searchParams.set("date", date);
  if (movieUrl) {
    const cinemaName = text(cinema.name, "nombre del cine").toLowerCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    url.searchParams.set("cine", cinemaName);
  }
  url.searchParams.set("language", text(language, "idioma"));
  const formats = format.split(/\s+/);
  const feature = ["DBOX", "PALCO", "PREMIER", "IMAX", "4D", "PLAY", "XD", "3D", "2D"].find((value) => formats.includes(value));
  if (!feature) throw new Error("Formato de enlace invalido.");
  url.searchParams.set("format", feature);
  return url.href;
}

export function normalizeSessions(session: RawSession, groups: RawPriceGroup[], cinema: RawCinema, extractedAt: string, movieUrl?: string): ScrapedSession[] {
  const { fecha, horario } = sessionDateTime(session);
  if (!isDate(session.sessionDisplayDate)) throw new Error("Fecha de cartelera invalida.");
  const sessionId = text(session.sessionId, "id de sesion");
  const cinemaId = text(session.theaterId, "id de cine");
  return normalizePrices(groups, session).map(({ areaId, ...price }) => {
    const sourceId = `${cinemaId}:${sessionId}:${areaId}`;
    const url = purchaseUrl(movieUrl, cinema, session.sessionDisplayDate, session.language.name, price.formato);
    return {
      id: `cinemark:${sourceId}`, origen: "cinemark", origenId: sourceId, extraidoEn: extractedAt,
      peliculaId: `cinemark:${session.corporateId}`, cineId: `cinemark:${cinemaId}`,
      fecha, fechaCartelera: session.sessionDisplayDate, horario, sala: text(session.theaterRoom, "sala"),
      idioma: text(session.language?.name, "idioma"), ...price,
      urlCompra: url, agotada: session.occupation?.availableSeats === 0,
    };
  });
}
