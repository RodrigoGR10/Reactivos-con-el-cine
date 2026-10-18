import dotenv from "dotenv";
dotenv.config();

import mongoose, { Schema } from "mongoose";
import type { Origen } from "../scraper/types.ts";
import { ORIGENES } from "../scraper/types.ts";
import { normalizarSinopsis } from "../utils/sinopsis.ts";
import { nombreColeccion } from "../utils/colecciones.ts";

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
  fuentes?: { origen: Origen; origenId: string }[];
}

const fuenteSchema = new Schema({
  origen: { type: String, enum: ORIGENES, required: true },
  origenId: { type: String, required: true },
}, { _id: false });

const peliculaSchema = new mongoose.Schema<Pelicula>(
  {
    titulo: { type: String, required: true },
    duracion: { type: Number, required: true },
    genero: { type: String, required: true },
    clasificacion: { type: String, required: true },
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
    },
  ) => {
    returnedObject.id = returnedObject._id?.toString();
    returnedObject.sinopsis = normalizarSinopsis(returnedObject.sinopsis);
    delete returnedObject._id;
    delete returnedObject.__v;
  },
});

export default PeliculaModel;
