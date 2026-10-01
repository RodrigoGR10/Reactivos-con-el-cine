import dotenv from "dotenv";
dotenv.config();

import mongoose, { Schema } from "mongoose";

const url = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_NAME || "reactivos-cine";

mongoose.set("strictQuery", false);

if (url) {
  mongoose.connect(url, { dbName }).catch((error) => {
    console.log("error connecting to MongoDB:", error.message);
  });
}

export interface Pelicula {
  id: number;
  titulo: string;
  duracion: number;
  genero: string;
  clasificacion: string;
  sinopsis: string;
  poster: string;
  banner?: string;
}

const peliculaSchema = new mongoose.Schema<Pelicula>(
  {
    id: { type: Number, required: true },
    titulo: { type: String, required: true },
    duracion: { type: Number, required: true },
    genero: { type: String, required: true },
    clasificacion: { type: String, required: true },
    sinopsis: { type: String, required: true },
    poster: { type: String, required: true },
    banner: { type: String },
  },
  {
    timestamps: true,
    strict: false, //Mantiene flexibilidad (solo es inicial)
  },
);

const PeliculaModel = mongoose.model<Pelicula>("Pelicula", peliculaSchema);

peliculaSchema.set("toJSON", {
  transform: (
    _,
    returnedObject: {
      id?: number;
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
