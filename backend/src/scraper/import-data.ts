import { isDate, ticketFormat } from "./normalize.ts";
import type { ScrapeResult, SourceRecord } from "./types.ts";

export function validateResult(value: unknown): asserts value is ScrapeResult {
  if (!value || typeof value !== "object") throw new Error("JSON de Cinemark invalido.");
  const result = value as ScrapeResult;
  if (result.meta?.origen !== "cinemark" || result.meta.version !== 1 || !result.meta.completo || !result.meta.terminadoEn || result.incidencias?.length !== 0) throw new Error("Solo se pueden importar extracciones completas y sin incidencias.");
  const nonempty = (item: object, fields: string[]) => {
    for (const field of fields) {
      const value = (item as Record<string, unknown>)[field];
      if (typeof value !== "string" || !value.trim()) throw new Error(`Falta ${field} en el JSON.`);
    }
  };
  const sourceIds = <T extends SourceRecord>(items: T[], name: string) => {
    if (!Array.isArray(items)) throw new Error(`${name} debe ser una lista.`);
    const ids = new Set<string>();
    for (const item of items) {
      if (!item || typeof item !== "object") throw new Error(`Registro invalido en ${name}.`);
      nonempty(item, ["id", "origenId", "extraidoEn"]);
      if (item.origen !== "cinemark" || item.id !== `cinemark:${item.origenId}` || ids.has(item.id)) throw new Error(`Identidad invalida o duplicada en ${name}.`);
      if (Number.isNaN(Date.parse(item.extraidoEn))) throw new Error("Fecha de extraccion invalida.");
      ids.add(item.id);
    }
    return ids;
  };
  const movies = sourceIds(result.peliculas, "peliculas");
  const cinemas = sourceIds(result.cines, "cines");
  sourceIds(result.funciones, "funciones");
  if (!isDate(result.meta.desde) || (result.meta.dias !== null && (!Number.isInteger(result.meta.dias) || result.meta.dias < 1 || result.meta.dias > 365))) throw new Error("Rango de extraccion invalido.");
  if (result.meta.cinesProcesados !== result.cines.length || result.meta.cinesSeleccionados !== result.cines.length) throw new Error("El alcance de cines no coincide con el archivo.");
  for (const movie of result.peliculas) {
    nonempty(movie, ["titulo", "genero", "clasificacion", "sinopsis", "poster"]);
    if (movie.url !== undefined) {
      const url = new URL(movie.url);
      if (url.protocol !== "https:" || url.hostname !== "www.cinemark.cl" || !/^\/pelicula\/[^/]+$/.test(url.pathname) || url.username || url.password) throw new Error("Enlace de pelicula invalido.");
    }
    if (!Number.isInteger(movie.duracion) || movie.duracion <= 0) throw new Error("Duracion invalida.");
  }
  for (const cinema of result.cines) nonempty(cinema, ["nombre", "comuna", "ciudad", "direccion", "url"]);
  for (const session of result.funciones) {
    nonempty(session, ["peliculaId", "cineId", "formato", "idioma", "sala", "tipoEntrada", "urlCompra"]);
    if (session.formato !== ticketFormat(session.formato, session.tipoEntrada)) throw new Error("El formato no coincide con la tarifa. Genera nuevamente el JSON con el scraper actualizado.");
    if (!movies.has(session.peliculaId) || !cinemas.has(session.cineId)) throw new Error("Funcion con pelicula o cine inexistente.");
    if (!isDate(session.fecha) || !isDate(session.fechaCartelera) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(session.horario)) throw new Error("Fecha u hora invalida.");
    if (!Number.isInteger(session.precio) || session.precio <= 0 || !Number.isInteger(session.cargoServicio) || session.cargoServicio < 0 || session.precioOnline !== session.precio + session.cargoServicio) throw new Error("Tarifa invalida en funcion.");
    const url = new URL(session.urlCompra);
    if (url.protocol !== "https:" || url.hostname !== "www.cinemark.cl" || url.username || url.password) throw new Error("Enlace de funcion invalido.");
  }
}
