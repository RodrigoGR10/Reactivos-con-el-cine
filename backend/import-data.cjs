/**
 * Importa backend/db.json a MongoDB.
 *
 * - Cada documento recibe su _id (ObjectId) generado por Mongo.
 * - El "id" numérico del db.json solo se usa para armar las relaciones
 *   (funciones -> película y cine) y NO se guarda en la base de datos.
 *
 * Uso (desde la carpeta backend):
 *   node import-data.cjs
 *
 * Variables de entorno opcionales (.env):
 *   MONGODB_URI  (por defecto mongodb://localhost:27017)
 *   MONGODB_NAME (por defecto reactivos-cine)
 */
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.MONGODB_NAME || "reactivos-cine";

const data = JSON.parse(
  fs.readFileSync(path.join(__dirname, "db.json"), "utf-8"),
);

// strict: false -> acepta cualquier campo del JSON
// id: false     -> evita el virtual "id" de Mongoose
const crearModelo = (nombre, coleccion) =>
  mongoose.model(
    nombre,
    new mongoose.Schema({}, { strict: false, id: false, timestamps: true }),
    coleccion,
  );

// Quita el id numérico del documento antes de insertarlo
const sinId = ({ id, ...resto }) => resto;

async function main() {
  await mongoose.connect(URI, { dbName: DB_NAME });
  console.log(`Conectado a "${DB_NAME}". Iniciando importación...`);

  const Pelicula = crearModelo("Pelicula", "peliculas");
  const Cine = crearModelo("Cine", "cines");
  const Funcion = crearModelo("Funcion", "funciones");

  // 1. Validar relaciones ANTES de borrar nada
  const idsPeliculas = new Set(data.peliculas.map((p) => p.id));
  const idsCines = new Set(data.cines.map((c) => c.id));

  const rotas = (data.funciones || []).filter(
    (f) => !idsPeliculas.has(f.peliculaId) || !idsCines.has(f.cineId),
  );
  if (rotas.length > 0) {
    throw new Error(
      `Funciones con película o cine inexistente (ids: ${rotas
        .map((f) => f.id)
        .join(", ")}). No se importó nada.`,
    );
  }

  // 2. Limpiar colecciones
  await Promise.all([
    Pelicula.deleteMany({}),
    Cine.deleteMany({}),
    Funcion.deleteMany({}),
  ]);

  // 3. Insertar películas y cines (insertMany conserva el orden)
  const peliculas = await Pelicula.insertMany(data.peliculas.map(sinId));
  const cines = await Cine.insertMany(data.cines.map(sinId));

  // 4. Mapas: id numérico del JSON -> _id real de Mongo
  const peliculaPorId = new Map(
    data.peliculas.map((p, i) => [p.id, peliculas[i]._id]),
  );
  const cinePorId = new Map(data.cines.map((c, i) => [c.id, cines[i]._id]));

  // 5. Insertar funciones con referencias por ObjectId
  const funciones = (data.funciones || []).map((f) => ({
    ...sinId(f),
    peliculaId: peliculaPorId.get(f.peliculaId),
    cineId: cinePorId.get(f.cineId),
  }));
  await Funcion.insertMany(funciones);

  console.log(
    `Importado: ${peliculas.length} películas, ${cines.length} cines, ${funciones.length} funciones`,
  );
}

main()
  .catch((err) => {
    console.error("Error:", err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
