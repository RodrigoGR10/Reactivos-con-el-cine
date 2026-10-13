import mongoose from "mongoose";
import fs from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { isDate, localNow, ticketFormat } from "./normalize.ts";
import type { ScrapeResult, SourceRecord } from "./types.ts";
import type { Funcion as FuncionData } from "../models/funcion.ts";

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

async function connectModels(uri: string, dbName: string) {
  await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 10_000, autoIndex: false, autoCreate: false });
  // Cargar los modelos aqui permite validar un JSON sin conectarse a Mongo.
  const { default: Pelicula } = await import("../models/pelicula.ts");
  const { default: Cine } = await import("../models/cine.ts");
  const { default: Funcion } = await import("../models/funcion.ts");
  const { default: User } = await import("../models/user.ts");
  return { Pelicula, Cine, Funcion, User };
}

export async function inspectCatalog(uri: string, dbName: string) {
  try {
    const { Pelicula, Cine, Funcion, User } = await connectModels(uri, dbName);
    return {
      base: dbName,
      peliculas: await Pelicula.countDocuments(),
      cines: await Cine.countDocuments(),
      funciones: await Funcion.countDocuments(),
      users: await User.countDocuments(),
    };
  } finally {
    await mongoose.disconnect();
  }
}

export interface ImportOptions {
  reset?: boolean;
  sync?: boolean;
  backupDirectory?: string;
}

export async function importCinemark(result: ScrapeResult, uri: string, dbName: string, options: ImportOptions = {}) {
  validateResult(result);
  if ((options.reset || options.sync) && result.meta.limitePorCine !== null) throw new Error("No se puede reiniciar o sincronizar con una muestra limitada.");
  if (options.reset && (!options.backupDirectory || !result.funciones.length)) throw new Error("El reinicio requiere respaldo y funciones nuevas validas.");
  try {
    const { Pelicula, Cine, Funcion } = await connectModels(uri, dbName);
    await Pelicula.createIndexes();
    await Cine.createIndexes();
    await Funcion.createIndexes();
    let backup: string | undefined;
    if (options.reset) {
      const snapshot = {
        base: dbName, creadoEn: new Date(),
        peliculas: await Pelicula.find({}).lean(),
        cines: await Cine.find({}).lean(),
        funciones: await Funcion.find({}).lean(),
      };
      fs.mkdirSync(options.backupDirectory!, { recursive: true });
      backup = join(options.backupDirectory!, `catalogo-${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID()}.json`);
      fs.writeFileSync(backup, mongoose.mongo.BSON.EJSON.stringify(snapshot, null, 2, { relaxed: false }), { encoding: "utf8", flag: "wx" });
      console.log(`Respaldo del catalogo: ${backup}`);
      await Funcion.deleteMany({});
      await Pelicula.deleteMany({});
      await Cine.deleteMany({});
      console.log("Catalogo anterior retirado. Las cuentas de usuario se conservaron.");
    }
    const movies = new Map<string, mongoose.Types.ObjectId>();
    const cinemas = new Map<string, mongoose.Types.ObjectId>();
    for (const { id, ...movie } of result.peliculas) {
      const saved = await Pelicula.findOneAndUpdate(
        { origen: "cinemark", origenId: movie.origenId },
        { $set: movie },
        { upsert: true, new: true, runValidators: true },
      );
      if (!saved) throw new Error(`No se pudo guardar la pelicula ${id}.`);
      movies.set(id, saved._id);
    }
    for (const { id, ...cinema } of result.cines) {
      const saved = await Cine.findOneAndUpdate(
        { origen: "cinemark", origenId: cinema.origenId },
        { $set: cinema },
        { upsert: true, new: true, runValidators: true },
      );
      if (!saved) throw new Error(`No se pudo guardar el cine ${id}.`);
      cinemas.set(id, saved._id);
    }
    for (let offset = 0; offset < result.funciones.length; offset += 250) {
      const batch = result.funciones.slice(offset, offset + 250);
      const operations: mongoose.AnyBulkWriteOperation<FuncionData>[] = [];
      for (const { id, ...session } of batch) {
        const peliculaId = movies.get(session.peliculaId);
        const cineId = cinemas.get(session.cineId);
        if (!peliculaId || !cineId) throw new Error(`Referencias incompletas para la funcion ${id}.`);
        const document = { ...session, peliculaId, cineId };
        // bulkWrite no valida updates: validar aqui no hace consultas a Mongo.
        await new Funcion(document).validate();
        operations.push({
          updateOne: {
            filter: { origen: "cinemark", origenId: session.origenId },
            update: { $set: document },
            upsert: true,
          },
        });
      }
      const saved = await Funcion.bulkWrite(operations, { ordered: true });
      if (saved.matchedCount + saved.upsertedCount !== batch.length) throw new Error("No se guardaron todas las funciones del lote.");
      console.log(`Importadas ${offset + batch.length}/${result.funciones.length} opciones de funcion.`);
    }
    let removedSessions = 0;
    let removedMovies = 0;
    if (options.sync) {
      const cinemaIds = [...cinemas.values()];
      const range: Record<string, string> = { $gte: result.meta.desde };
      if (result.meta.dias !== null) range.$lt = new Date(Date.parse(`${result.meta.desde}T00:00:00Z`) + result.meta.dias * 86_400_000).toISOString().slice(0, 10);
      const stale = await Funcion.deleteMany({
        origen: "cinemark", cineId: { $in: cinemaIds }, fechaCartelera: range,
        origenId: { $nin: result.funciones.map((session) => session.origenId) },
      });
      const now = localNow();
      const expired = await Funcion.deleteMany({
        origen: "cinemark", cineId: { $in: cinemaIds },
        $or: [{ fecha: { $lt: now.slice(0, 10) } }, { fecha: now.slice(0, 10), horario: { $lt: now.slice(11, 16) } }],
      });
      removedSessions = stale.deletedCount + expired.deletedCount;
      const referencedMovies = await Funcion.distinct("peliculaId");
      removedMovies = (await Pelicula.deleteMany({ origen: "cinemark", _id: { $nin: referencedMovies } })).deletedCount;
      console.log(`Retiradas ${removedSessions} funciones antiguas y ${removedMovies} peliculas sin funciones.`);
    }
    return {
      base: dbName, backup, retiradas: { funciones: removedSessions, peliculas: removedMovies },
      peliculas: await Pelicula.countDocuments(),
      cines: await Cine.countDocuments(),
      funciones: await Funcion.countDocuments(),
    };
  } finally {
    await mongoose.disconnect();
  }
}
