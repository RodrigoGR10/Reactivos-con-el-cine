import mongoose from "mongoose";
import Pelicula from "../models/pelicula.ts";
import { normalizarGeneros } from "../utils/generos.ts";

// Uso: node src/scripts/normalizar-generos.ts [--write]
// Sin --write solo muestra qué cambiaría.
async function main() {
    if (!process.env.MONGODB_URI)
        throw new Error("Configura MONGODB_URI en backend/.env.");
    const escribir = process.argv.includes("--write");

    await mongoose.connection.asPromise();
    const peliculas = await Pelicula.find({}).select("titulo genero").lean();

    let cambios = 0;
    const finales = new Set<string>();

    for (const pelicula of peliculas) {
        const nuevo = normalizarGeneros(pelicula.genero);
        nuevo.split(", ").forEach((genero) => finales.add(genero));
        if (nuevo === pelicula.genero) continue;

        cambios++;
        console.log(`${pelicula.titulo}: "${pelicula.genero}" -> "${nuevo}"`);
        if (escribir)
            await Pelicula.updateOne(
                { _id: pelicula._id },
                { $set: { genero: nuevo } },
            );
    }

    console.log(
        `\n${cambios} de ${peliculas.length} películas ${escribir ? "actualizadas" : "cambiarían (usa --write para guardar)"}.`,
    );
    console.log(
        `Géneros resultantes: ${[...finales].sort((a, b) => a.localeCompare(b, "es")).join(" | ")}`,
    );
}

main()
    .catch((error) => {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
    })
    .finally(() => mongoose.connection.close());
