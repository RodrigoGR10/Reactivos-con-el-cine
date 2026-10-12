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
  peliculaId: mongoose.Types.ObjectId;
  cineId: mongoose.Types.ObjectId;
  horario: string;
  formato: string;
  idioma: string;
  precio: number;
  fecha?: string;
  fechaCartelera?: string;
  sala?: string;
  cargoServicio?: number;
  precioOnline?: number;
  tipoEntrada?: string;
  urlCompra?: string;
  agotada?: boolean;
  origen?: string;
  origenId?: string;
  extraidoEn?: string;
}

const funcionSchema = new mongoose.Schema<Funcion>(
  {
    peliculaId: {
      type: Schema.Types.ObjectId,
      ref: "Pelicula",
      required: true,
    },
    cineId: { type: Schema.Types.ObjectId, ref: "Cine", required: true },
    horario: { type: String, required: true },
    formato: { type: String, required: true },
    idioma: { type: String, required: true },
    precio: { type: Number, required: true },
    fecha: { type: String },
    fechaCartelera: { type: String },
    sala: { type: String },
    cargoServicio: { type: Number },
    precioOnline: { type: Number },
    tipoEntrada: { type: String },
    urlCompra: { type: String },
    agotada: { type: Boolean },
    origen: { type: String },
    origenId: { type: String },
    extraidoEn: { type: String },
  },
  {
    timestamps: true,
  },
);

funcionSchema.index({ origen: 1, origenId: 1 }, {
  unique: true, partialFilterExpression: { origen: "cinemark", origenId: { $type: "string" } },
});

const FuncionModel = mongoose.model<Funcion>(
  "Funcion",
  funcionSchema,
  "funciones",
);

funcionSchema.set("toJSON", {
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

export default FuncionModel;
