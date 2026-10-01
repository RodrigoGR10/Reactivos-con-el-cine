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
export interface Funcion {
  id: number;
  peliculaId: number;
  cineId: number;
  horario: string;
  formato: string;
  idioma: string;
  precio: number;
}

const funcionSchema = new mongoose.Schema<Funcion>(
  {
    id: { type: Number, required: true },
    peliculaId: { type: Number, required: true },
    cineId: { type: Number, required: true },
    horario: { type: String, required: true },
    formato: { type: String, required: true },
    idioma: { type: String, required: true },
    precio: { type: Number, required: true },
  },
  {
    timestamps: true,
    strict: false, //Mantiene flexibilidad (solo es inicial)
  },
);

const FuncionModel = mongoose.model<Funcion>(
  "Funcion",
  funcionSchema,
  "funciones",
);

funcionSchema.set("toJSON", {
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

export default FuncionModel;
