import dotenv from "dotenv";
import { normalizarGeneros } from "../utils/generos.ts";
dotenv.config();

import mongoose, { Schema } from "mongoose";
import type { Origen } from "../scraper/types.ts";
import { ORIGENES } from "../scraper/types.ts";
import { normalizarSinopsis } from "../utils/sinopsis.ts";
import { normalizarClasificacion } from "../utils/clasificaciones.ts";
import { nombreColeccion } from "../utils/colecciones.ts";
import { ESTADOS_ESTRENO, type DatosEstreno } from "../utils/estreno.ts";

export interface FuentePelicula extends DatosEstreno {
  origen: Origen;
  origenId: string;
}

const url = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_NAME || "reactivos-cine";

mongoose.set("strictQuery", false);

if (url && mongoose.connection.readyState === 0) {
  mongoose.connect(url, { dbName }).catch((error) => {
    console.log("error connecting to MongoDB:", error.message);
  });
}

export interface Pelicula {
  titulo: string;
  duracion: number;
  genero: string;
  clasificacion: string;
  sinopsis: string;
  poster: string;
  banner?: string;
  tmdbId?: number;
  url?: string;
  origen?: string;
  origenId?: string;
  extraidoEn?: string;
  fuentes?: FuentePelicula[];
}

const fuenteSchema = new Schema({
  origen: { type: String, enum: ORIGENES, required: true },
  origenId: { type: String, required: true },
  estadoEstreno: { type: String, enum: ESTADOS_ESTRENO },
  fechaEstreno: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
}, { _id: false });

const peliculaSchema = new mongoose.Schema<Pelicula>(
  {
    titulo: { type: String, required: true },
    duracion: { type: Number, required: true },
    genero: { type: String, required: true, set: normalizarGeneros },
    clasificacion: { type: String, required: true, set: normalizarClasificacion },
    sinopsis: { type: String, required: true, set: normalizarSinopsis },
    poster: { type: String, required: true },
    banner: { type: String },
    tmdbId: { type: Number },
    url: { type: String },
    origen: { type: String },
    origenId: { type: String },
    extraidoEn: { type: String },
    fuentes: { type: [fuenteSchema], default: [] },
  },
  {
    timestamps: true,
  },
);

peliculaSchema.index({ origen: 1, origenId: 1 }, {
  unique: true, partialFilterExpression: { origen: "cinemark", origenId: { $type: "string" } },
});
peliculaSchema.index({ "fuentes.origen": 1, "fuentes.origenId": 1 }, {
  unique: true, partialFilterExpression: { "fuentes.origenId": { $type: "string" } },
});

const PeliculaModel = mongoose.model<Pelicula>("Pelicula", peliculaSchema, nombreColeccion("peliculas"));

peliculaSchema.set("toJSON", {
  transform: (
    _,
    returnedObject: {
      id?: string;
      _id?: mongoose.Types.ObjectId;
      __v?: number;
      sinopsis?: string;
      clasificacion?: string;
    },
  ) => {
    returnedObject.id = returnedObject._id?.toString();
    returnedObject.sinopsis = normalizarSinopsis(returnedObject.sinopsis);
    returnedObject.clasificacion = normalizarClasificacion(returnedObject.clasificacion);
    delete returnedObject._id;
    delete returnedObject.__v;
  },
});

export default PeliculaModel;
