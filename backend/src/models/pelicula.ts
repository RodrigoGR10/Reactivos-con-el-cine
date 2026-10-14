import dotenv from "dotenv";
dotenv.config();

import mongoose, { Schema } from "mongoose";

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
  url?: string;
  origen?: string;
  origenId?: string;
  extraidoEn?: string;
}

const peliculaSchema = new mongoose.Schema<Pelicula>(
  {
    titulo: { type: String, required: true },
    duracion: { type: Number, required: true },
    genero: { type: String, required: true },
    clasificacion: { type: String, required: true },
    sinopsis: { type: String, required: true },
    poster: { type: String, required: true },
    banner: { type: String },
    url: { type: String },
    origen: { type: String },
    origenId: { type: String },
    extraidoEn: { type: String },
  },
  {
    timestamps: true,
  },
);

peliculaSchema.index({ origen: 1, origenId: 1 }, {
  unique: true, partialFilterExpression: { origen: "cinemark", origenId: { $type: "string" } },
});

const PeliculaModel = mongoose.model<Pelicula>("Pelicula", peliculaSchema);

peliculaSchema.set("toJSON", {
  transform: (
    _,
    returnedObject: {
      id?: string;
      _id?: mongoose.Types.ObjectId;
      __v?: number;
    },
  ) => {
    returnedObject.id = returnedObject._id?.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
  },
});

export default PeliculaModel;
