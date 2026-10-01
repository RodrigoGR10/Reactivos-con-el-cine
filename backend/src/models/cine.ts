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
  id: number;
  nombre: string;
  comuna: string;
  logo?: string;
}

const cineSchema = new mongoose.Schema<Cine>(
  {
    id: { type: Number, required: true },
    nombre: { type: String, required: true },
    comuna: { type: String, required: true },
    logo: { type: String },
  },
  {
    timestamps: true,
    strict: false, //Mantiene flexibilidad (solo es inicial)
  },
);

const CineModel = mongoose.model<Cine>('Cine', cineSchema, 'cines');

cineSchema.set("toJSON", {
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

export default CineModel;
