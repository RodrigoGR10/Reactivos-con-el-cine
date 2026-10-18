import "dotenv/config";
import mongoose from "mongoose";

export function nombreColeccion(nombre: string): string {
  const prefijo = process.env.MONGODB_COLLECTION_PREFIX || "";
  const dbName = mongoose.connection.name || process.env.MONGODB_NAME;

  if (dbName === "fullstack" && !prefijo) {
    throw new Error("Configura MONGODB_COLLECTION_PREFIX para usar la base compartida fullstack.");
  }
  if (prefijo && !/^[a-zA-Z0-9_]+$/.test(prefijo)) {
    throw new Error("MONGODB_COLLECTION_PREFIX solo permite letras, numeros y guiones bajos.");
  }

  return `${prefijo}${nombre}`;
}
