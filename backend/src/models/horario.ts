import mongoose, { Schema } from "mongoose";
import type { Origen, ScrapedSession } from "../scraper/types.ts";
import { ORIGENES } from "../scraper/types.ts";
import { nombreColeccion } from "../utils/colecciones.ts";

export interface Horario {
  peliculaId: mongoose.Types.ObjectId;
  cineId: mongoose.Types.ObjectId;
  origen: Origen;
  origenId: string;
  extraidoEn: string;
  sesionId: string;
  fecha: string;
  fechaCartelera: string;
  horario: string;
  formatoResumen: string;
  idioma: string;
  sala: string;
  agotada: boolean;
  revision: string;
  peliculaOrigenId?: string;
  peliculaUrl?: string;
  urlCompra?: string;
  tarifas: ScrapedSession[];
  preciosRevision?: string;
  preciosConsultadosEn?: Date;
  preciosErrorHasta?: Date;
  preciosErrorRevision?: string;
  consultaPreciosHasta?: Date;
  consultaPreciosRevision?: string;
  consultaPreciosToken?: string;
}

const tarifaSchema = new Schema<ScrapedSession>({
  id: { type: String, required: true },
  origen: { type: String, enum: ORIGENES, required: true },
  origenId: { type: String, required: true },
  extraidoEn: { type: String, required: true },
  peliculaId: { type: String, required: true },
  cineId: { type: String, required: true },
  fecha: { type: String, required: true },
  fechaCartelera: { type: String, required: true },
  horario: { type: String, required: true },
  formato: { type: String, required: true },
  idioma: { type: String, required: true },
  sala: { type: String, default: "" },
  precio: { type: Number, min: 1 },
  precioOnline: { type: Number, min: 1, required: true },
  cargoServicio: { type: Number, min: 0 },
  tipoEntrada: { type: String, required: true },
  urlCompra: { type: String, required: true },
  agotada: { type: Boolean, required: true },
}, { _id: false, id: false });

const horarioSchema = new Schema<Horario>({
  peliculaId: { type: Schema.Types.ObjectId, ref: "Pelicula", required: true },
  cineId: { type: Schema.Types.ObjectId, ref: "Cine", required: true },
  origen: { type: String, enum: ORIGENES, required: true },
  origenId: { type: String, required: true },
  extraidoEn: { type: String, required: true },
  sesionId: { type: String, required: true },
  fecha: { type: String, required: true },
  fechaCartelera: { type: String, required: true },
  horario: { type: String, required: true },
  formatoResumen: { type: String, required: true },
  idioma: { type: String, required: true },
  sala: { type: String, default: "" },
  agotada: { type: Boolean, required: true },
  revision: { type: String, required: true },
  peliculaOrigenId: String,
  peliculaUrl: String,
  urlCompra: String,
  tarifas: { type: [tarifaSchema], default: [] },
  preciosRevision: String,
  preciosConsultadosEn: Date,
  preciosErrorHasta: Date,
  preciosErrorRevision: String,
  consultaPreciosHasta: Date,
  consultaPreciosRevision: String,
  consultaPreciosToken: String,
}, { timestamps: true });

horarioSchema.index({ origen: 1, origenId: 1 }, { unique: true });
horarioSchema.index({ peliculaId: 1, cineId: 1, fecha: 1, horario: 1 });
horarioSchema.index({ fecha: 1, horario: 1 });

export default mongoose.model<Horario>("Horario", horarioSchema, nombreColeccion("horarios"));
