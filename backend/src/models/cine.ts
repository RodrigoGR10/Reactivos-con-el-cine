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
cineSchema.index({ origenId: 1 }, {
  unique: true, partialFilterExpression: { origen: "cineplanet", origenId: { $type: "string" } }, name: "cineplanet_origenId",
});
for (const origen of ["muvix", "cinestar"]) {
  cineSchema.index({ origenId: 1 }, {
    unique: true, partialFilterExpression: { origen, origenId: { $type: "string" } }, name: `${origen}_origenId`,
  });
}

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
