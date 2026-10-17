import mongoose from "mongoose";
import fs from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { isDate, localNow, scheduleRevision } from "./normalize.ts";
import { ticketFormat } from "./cinemark/normalize.ts";
import type { ScrapeResult, SourceRecord } from "./types.ts";
import { ORIGENES } from "./types.ts";
import { purchaseUrl } from "./vista/client.ts";
import type { Funcion as FuncionData } from "../models/funcion.ts";
import type { Horario as HorarioData } from "../models/horario.ts";

export function validateResult(value: unknown, allowPartial = false): asserts value is ScrapeResult {
  if (!value || typeof value !== "object") throw new Error("JSON de cartelera invalido.");
  const result = value as ScrapeResult;
  if (!ORIGENES.includes(result.meta?.origen) || result.meta.version !== 1 || typeof result.meta.completo !== "boolean" || !result.meta.terminadoEn || !Array.isArray(result.incidencias)) throw new Error("Datos de extraccion invalidos.");
  const origin = result.meta.origen;
  const prefix = `${origin}:`;
  if (origin !== "cinemark" && result.meta.modo !== "cartelera") throw new Error(`${origin} requiere una extraccion de horarios.`);
  const partial = allowPartial && !result.meta.completo;
  if (!partial && (!result.meta.completo || result.incidencias.length > 0)) throw new Error("Solo se pueden importar extracciones completas y sin incidencias.");
  if (result.meta.modo !== undefined && result.meta.modo !== "cartelera") throw new Error("Modo de extraccion invalido.");
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
      if (item.origen !== origin || item.id !== `${prefix}${item.origenId}` || ids.has(item.id)) throw new Error(`Identidad invalida o duplicada en ${name}.`);
      if (Number.isNaN(Date.parse(item.extraidoEn))) throw new Error("Fecha de extraccion invalida.");
      ids.add(item.id);
    }
    return ids;
  };
  const movies = sourceIds(result.peliculas, "peliculas");
  const cinemas = sourceIds(result.cines, "cines");
  sourceIds(result.funciones, "funciones");
  if (!isDate(result.meta.desde) || (result.meta.dias !== null && (!Number.isInteger(result.meta.dias) || result.meta.dias < 1 || result.meta.dias > 365))) throw new Error("Rango de extraccion invalido.");
  if (!Number.isInteger(result.meta.cinesProcesados) || result.meta.cinesProcesados < 0 || result.meta.cinesProcesados > result.cines.length || !Number.isInteger(result.meta.cinesSeleccionados) || result.meta.cinesSeleccionados < 1 || result.meta.cinesSeleccionados < result.cines.length || (!partial && (result.meta.cinesSeleccionados !== result.cines.length || result.meta.cinesProcesados !== result.cines.length))) throw new Error("El alcance de cines no coincide con el archivo.");
  if (result.meta.cinesDisponibles !== undefined && (!Number.isInteger(result.meta.cinesDisponibles) || result.meta.cinesDisponibles < result.meta.cinesSeleccionados)) throw new Error("Total de cines invalido.");
  if (result.meta.peliculasConFuncionesFuturas !== undefined && (!Array.isArray(result.meta.peliculasConFuncionesFuturas) || result.meta.peliculasConFuncionesFuturas.some((id) => typeof id !== "string" || !id.trim()))) throw new Error("Peliculas futuras invalidas.");
  for (const movie of result.peliculas) {
    nonempty(movie, ["titulo", "genero", "clasificacion", "sinopsis", "poster"]);
    if (movie.url !== undefined) {
      const url = new URL(movie.url);
      const path = origin === "cinemark" ? /^\/pelicula\/[^/]+$/ : origin === "cineplanet" ? /^\/peliculas\/[^/]+$/ : /^\/Browsing\/Movies\/Details\/h-[^/]+$/;
      const hostname = origin === "muvix" || origin === "cinestar" ? `${origin}.cl` : `www.${origin}.cl`;
      if (url.protocol !== "https:" || url.hostname !== hostname || !path.test(url.pathname) || url.username || url.password) throw new Error("Enlace de pelicula invalido.");
    }
    if (!Number.isInteger(movie.duracion) || movie.duracion <= 0) throw new Error("Duracion invalida.");
  }
  for (const cinema of result.cines) {
    nonempty(cinema, ["nombre", "comuna", "ciudad", "direccion", "url"]);
    const url = new URL(cinema.url);
    const hostname = origin === "muvix" || origin === "cinestar" ? `${origin}.cl` : `www.${origin}.cl`;
    if (url.protocol !== "https:" || url.hostname !== hostname || url.username || url.password) throw new Error("Enlace de cine invalido.");
  }
  if (result.meta.modo === "cartelera") {
    sourceIds(result.horarios!, "horarios");
    if (result.funciones.length) throw new Error("La cartelera ligera no debe contener tarifas.");
    for (const schedule of result.horarios!) {
      nonempty(schedule, ["peliculaId", "cineId", "sesionId", "formatoResumen", "idioma", "revision", ...(origin === "cinemark" ? ["sala"] : [])]);
      if (typeof schedule.sala !== "string") throw new Error("Sala invalida.");
      if (!movies.has(schedule.peliculaId) || !cinemas.has(schedule.cineId)) throw new Error("Horario con referencias inexistentes.");
      if (!isDate(schedule.fecha) || !isDate(schedule.fechaCartelera) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(schedule.horario)) throw new Error("Fecha u hora de cartelera invalida.");
      if (typeof schedule.agotada !== "boolean" || schedule.origenId !== `${schedule.cineId.slice(prefix.length)}:${schedule.sesionId}` || schedule.revision !== scheduleRevision(schedule)) throw new Error("Identidad o revision de horario invalida.");
      if (origin === "cineplanet") {
        const url = new URL(schedule.urlCompra!);
        if (url.origin !== "https://www.cineplanet.cl" || url.username || url.password || !/^\d+$/.test(schedule.sesionId) || !url.pathname.endsWith(`/${schedule.cineId.slice(prefix.length)}/${schedule.sesionId}/asientos`)) throw new Error("Enlace de funcion de Cineplanet invalido.");
      }
      if ((origin === "muvix" || origin === "cinestar") && schedule.urlCompra !== purchaseUrl(origin, schedule.cineId.slice(prefix.length), schedule.sesionId)) throw new Error("Enlace de funcion invalido.");
    }
  } else if (result.horarios !== undefined) {
    throw new Error("Los horarios requieren el modo cartelera.");
  }
  for (const session of result.funciones) {
    nonempty(session, ["peliculaId", "cineId", "formato", "idioma", "sala", "tipoEntrada", "urlCompra"]);
    if (session.formato !== ticketFormat(session.formato, session.tipoEntrada)) throw new Error("El formato no coincide con la tarifa. Genera nuevamente el JSON con el scraper actualizado.");
    if (!movies.has(session.peliculaId) || !cinemas.has(session.cineId)) throw new Error("Funcion con pelicula o cine inexistente.");
    if (!isDate(session.fecha) || !isDate(session.fechaCartelera) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(session.horario)) throw new Error("Fecha u hora invalida.");
    if (typeof session.precio !== "number" || typeof session.cargoServicio !== "number" || !Number.isInteger(session.precio) || session.precio <= 0 || !Number.isInteger(session.cargoServicio) || session.cargoServicio < 0 || session.precioOnline !== session.precio + session.cargoServicio) throw new Error("Tarifa invalida en funcion.");
    const url = new URL(session.urlCompra);
    if (url.protocol !== "https:" || url.hostname !== "www.cinemark.cl" || url.username || url.password) throw new Error("Enlace de funcion invalido.");
  }
}

async function connectModels(uri: string, dbName: string) {
  await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 10_000, autoIndex: false, autoCreate: false });
  const { default: Pelicula } = await import("../models/pelicula.ts");
  const { default: Cine } = await import("../models/cine.ts");
  const { default: Funcion } = await import("../models/funcion.ts");
  const { default: Horario } = await import("../models/horario.ts");
  const { default: User } = await import("../models/user.ts");
  return { Pelicula, Cine, Funcion, Horario, User };
}

export async function inspectCatalog(uri: string, dbName: string) {
  try {
    const { Pelicula, Cine, Funcion, Horario, User } = await connectModels(uri, dbName);
    return {
      base: dbName,
      peliculas: await Pelicula.countDocuments(),
      cines: await Cine.countDocuments(),
      funciones: await Funcion.countDocuments(),
      horarios: await Horario.countDocuments(),
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
  allowPartial?: boolean;
}

export async function importCatalog(result: ScrapeResult, uri: string, dbName: string, options: ImportOptions = {}) {
  validateResult(result, options.allowPartial);
  const origin = result.meta.origen;
  if (!result.meta.completo && (options.reset || options.sync)) throw new Error("Una extraccion parcial no permite borrar registros anteriores.");
  if (!result.meta.completo && !result.funciones.length && !result.horarios?.length) throw new Error("La extraccion parcial no contiene funciones ni horarios validos.");
  if (options.reset && result.meta.modo === "cartelera") throw new Error("La cartelera ligera se actualiza sin reiniciar el catalogo. No uses --reset.");
  if ((options.reset || options.sync) && result.meta.limitePorCine !== null) throw new Error("No se puede reiniciar o sincronizar con una muestra limitada.");
  if (options.reset && (!options.backupDirectory || !result.funciones.length)) throw new Error("El reinicio requiere respaldo y funciones nuevas validas.");
  try {
    const { Pelicula, Cine, Funcion, Horario } = await connectModels(uri, dbName);
    await Pelicula.createIndexes();
    await Cine.createIndexes();
    await Funcion.createIndexes();
    await Horario.createIndexes();
    let backup: string | undefined;
    if (options.reset) {
      const snapshot = {
        base: dbName, creadoEn: new Date(),
        peliculas: await Pelicula.find({}).lean(),
        cines: await Cine.find({}).lean(),
        funciones: await Funcion.find({}).lean(),
        horarios: await Horario.find({}).lean(),
      };
      fs.mkdirSync(options.backupDirectory!, { recursive: true });
      backup = join(options.backupDirectory!, `catalogo-${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID()}.json`);
      fs.writeFileSync(backup, mongoose.mongo.BSON.EJSON.stringify(snapshot, null, 2, { relaxed: false }), { encoding: "utf8", flag: "wx" });
      console.log(`Respaldo del catalogo: ${backup}`);
      await Funcion.deleteMany({});
      await Horario.deleteMany({});
      await Pelicula.deleteMany({});
      await Cine.deleteMany({});
      console.log("Catalogo anterior retirado. Las cuentas de usuario se conservaron.");
    }
    const movies = new Map<string, mongoose.Types.ObjectId>();
    const cinemas = new Map<string, mongoose.Types.ObjectId>();
    const catalog = await Pelicula.find({}).lean();
    const movieKey = (movie: { titulo: string }) => movie.titulo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/\s+INFINITY VISION$/, "").replace(/[^A-Z0-9]/g, "");
    for (const { id, ...movie } of result.peliculas) {
      const source = { origen: origin, origenId: movie.origenId };
      let existing = await Pelicula.findOne({ $or: [source, { fuentes: { $elemMatch: source } }] }).lean();
      if (!existing) {
        const candidates = catalog.filter((item) => movieKey(item) === movieKey(movie) && Math.abs(item.duracion - movie.duracion) <= 3);
        if (candidates.length === 1) existing = candidates[0]!;
      }
      const primary = !existing || (existing.origen === origin && existing.origenId === movie.origenId);
      const saved = await Pelicula.findOneAndUpdate(
        existing ? { _id: existing._id } : source,
        { ...(primary ? { $set: movie } : {}), $addToSet: { fuentes: source } },
        { upsert: true, returnDocument: "after", runValidators: true },
      );
      if (!saved) throw new Error(`No se pudo guardar la pelicula ${id}.`);
      movies.set(id, saved._id);
      if (!catalog.some((item) => item._id.equals(saved._id))) catalog.push(saved.toObject());
    }
    for (const { id, ...cinema } of result.cines) {
      const saved = await Cine.findOneAndUpdate(
        { origen: origin, origenId: cinema.origenId },
        { $set: cinema },
        { upsert: true, returnDocument: "after", runValidators: true },
      );
      if (!saved) throw new Error(`No se pudo guardar el cine ${id}.`);
      cinemas.set(id, saved._id);
    }
    for (let offset = 0; offset < (result.horarios?.length ?? 0); offset += 250) {
      const batch = result.horarios!.slice(offset, offset + 250);
      const operations: mongoose.AnyBulkWriteOperation<HorarioData>[] = [];
      for (const { id, ...schedule } of batch) {
        const peliculaId = movies.get(schedule.peliculaId);
        const cineId = cinemas.get(schedule.cineId);
        if (!peliculaId || !cineId) throw new Error(`Referencias incompletas para el horario ${id}.`);
        const movie = result.peliculas.find((movie) => movie.id === schedule.peliculaId)!;
        const document = { ...schedule, peliculaId, cineId, peliculaOrigenId: movie.origenId, peliculaUrl: movie.url };
        await new Horario(document).validate();
        operations.push({ updateOne: {
          filter: { origen: origin, origenId: schedule.origenId },
          update: { $set: document, $setOnInsert: { tarifas: [] } },
          upsert: true,
        } });
      }
      const saved = await Horario.bulkWrite(operations, { ordered: true });
      if (saved.matchedCount + saved.upsertedCount !== batch.length) throw new Error("No se guardaron todos los horarios del lote.");
      console.log(`Importados ${offset + batch.length}/${result.horarios!.length} horarios sin consultas de precios.`);
    }
    for (let offset = 0; offset < result.funciones.length; offset += 250) {
      const batch = result.funciones.slice(offset, offset + 250);
      const operations: mongoose.AnyBulkWriteOperation<FuncionData>[] = [];
      for (const { id, ...session } of batch) {
        const peliculaId = movies.get(session.peliculaId);
        const cineId = cinemas.get(session.cineId);
        if (!peliculaId || !cineId) throw new Error(`Referencias incompletas para la funcion ${id}.`);
        const document = { ...session, peliculaId, cineId };
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
    let removedSchedules = 0;
    if (options.sync) {
      const cinemaIds = [...cinemas.values()];
      const range: Record<string, string> = { $gte: result.meta.desde };
      if (result.meta.dias !== null) range.$lt = new Date(Date.parse(`${result.meta.desde}T00:00:00Z`) + result.meta.dias * 86_400_000).toISOString().slice(0, 10);
      if (result.meta.modo === "cartelera") {
        const stale = await Horario.deleteMany({
          origen: origin, cineId: { $in: cinemaIds }, fechaCartelera: range,
          origenId: { $nin: result.horarios!.map((schedule) => schedule.origenId) },
        });
        const now = localNow();
        const expired = await Horario.deleteMany({
          origen: origin, cineId: { $in: cinemaIds },
          $or: [{ fecha: { $lt: now.slice(0, 10) } }, { fecha: now.slice(0, 10), horario: { $lt: now.slice(11, 16) } }],
        });
        removedSchedules = stale.deletedCount + expired.deletedCount;
        console.log(`Retirados ${removedSchedules} horarios antiguos. Se conservaron peliculas y tarifas anteriores.`);
      } else {
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
      if (result.meta.cinesSeleccionados === result.meta.cinesDisponibles && result.meta.peliculasConFuncionesFuturas) {
        const referencedMovies = [...await Funcion.distinct("peliculaId"), ...await Horario.distinct("peliculaId")];
        removedMovies = (await Pelicula.deleteMany({
          origen: "cinemark", "fuentes.origen": { $nin: ORIGENES.filter((origin) => origin !== "cinemark") }, origenId: { $nin: result.meta.peliculasConFuncionesFuturas },
          _id: { $nin: referencedMovies },
        })).deletedCount;
      }
      console.log(`Retiradas ${removedSessions} funciones antiguas y ${removedMovies} peliculas sin funciones.`);
      }
    }
    return {
      base: dbName, backup, retiradas: { funciones: removedSessions, peliculas: removedMovies, horarios: removedSchedules },
      peliculas: await Pelicula.countDocuments(),
      cines: await Cine.countDocuments(),
      funciones: await Funcion.countDocuments(),
      horarios: await Horario.countDocuments(),
    };
  } finally {
    await mongoose.disconnect();
  }
}
