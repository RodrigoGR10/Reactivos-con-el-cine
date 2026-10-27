import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import { nombreColeccion } from "../utils/colecciones.ts";
import { normalizarComuna } from "../utils/comunas.ts";

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
        comuna: { type: String, required: true, set: normalizarComuna },
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

// El orden evita conflictos con el indice anterior de Cinemark.
cineSchema.index(
    { origenId: 1, origen: 1 },
    {
        unique: true,
        partialFilterExpression: {
            origenId: { $type: "string" },
            origen: { $type: "string" },
        },
    },
);

const CineModel = mongoose.model<Cine>(
    "Cine",
    cineSchema,
    nombreColeccion("cines"),
);

cineSchema.set("toJSON", {
    transform: (
        _,
        returnedObject: {
            id?: string;
            comuna?: string;
            _id?: mongoose.Types.ObjectId;
            __v?: number;
        },
    ) => {
        returnedObject.id = returnedObject._id?.toString();
        // Normaliza tambien los registros guardados antes de corregir el scraper.
        if (typeof returnedObject.comuna === "string") {
            returnedObject.comuna = normalizarComuna(returnedObject.comuna);
        }
        delete returnedObject._id;
        delete returnedObject.__v;
    },
});

export default CineModel;
