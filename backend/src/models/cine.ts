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
export interface Cine {
  nombre: string;
  comuna: string;
  logo?: string;
  direccion?: string;
  ciudad?: string;
  latitud?: number;
  longitud?: number;
  url?: string;
  origen?: string;
  origenId?: string;
  extraidoEn?: string;
}

const cineSchema = new mongoose.Schema<Cine>(
  {
    nombre: { type: String, required: true },
    comuna: { type: String, required: true },
    logo: { type: String },
    direccion: { type: String },
    ciudad: { type: String },
    latitud: { type: Number },
    longitud: { type: Number },
    url: { type: String },
    origen: { type: String },
    origenId: { type: String },
    extraidoEn: { type: String },
  },
  {
    timestamps: true,
  },
);

cineSchema.index({ origen: 1, origenId: 1 }, {
  unique: true, partialFilterExpression: { origen: "cinemark", origenId: { $type: "string" } },
});

const CineModel = mongoose.model<Cine>("Cine", cineSchema, "cines");

cineSchema.set("toJSON", {
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

export default CineModel;
