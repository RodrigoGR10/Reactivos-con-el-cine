import mongoose from "mongoose";
import Cine from "../models/cine.ts";
import {
    claveComuna,
    esComunaOficial,
    normalizarComuna,
} from "../utils/comunas.ts";

// Uso: node src/scripts/normalizar-comunas.ts [--write]
// Sin --write solo muestra qué cambiaría.
async function main() {
    if (!process.env.MONGODB_URI)
        throw new Error("Configura MONGODB_URI en backend/.env.");
    const escribir = process.argv.includes("--write");

    await mongoose.connection.asPromise();
    const cines = await Cine.find({}).select("nombre comuna").lean();

    let cambios = 0;
    const finales = new Map<string, Set<string>>();

    for (const cine of cines) {
        const nueva = normalizarComuna(cine.comuna);
        const clave = claveComuna(nueva);
        finales.set(clave, (finales.get(clave) ?? new Set()).add(nueva));
        if (nueva === cine.comuna) continue;

        cambios++;
        console.log(`${cine.nombre}: "${cine.comuna}" -> "${nueva}"`);
        if (escribir)
            await Cine.updateOne(
                { _id: cine._id },
                { $set: { comuna: nueva } },
            );
    }

    console.log(
        `\n${cambios} de ${cines.length} cines ${escribir ? "actualizados" : "cambiarían (usa --write para guardar)"}.`,
    );
    console.log(
        `Comunas resultantes: ${[...finales.values()]
            .flatMap((v) => [...v])
            .sort((a, b) => a.localeCompare(b, "es-CL"))
            .join(" | ")}`,
    );

    const noOficiales = [...finales.values()]
        .flatMap((v) => [...v])
        .filter((comuna) => !esComunaOficial(comuna));
    if (noOficiales.length > 0) {
        console.log(
            "\nValores que no son comunas oficiales (pueden ser ciudades o errores del scraper):",
        );
        noOficiales.forEach((comuna) => console.log(`  ${comuna}`));
    }

    const sinUnificar = [...finales.values()].filter(
        (variantes) => variantes.size > 1,
    );
    if (sinUnificar.length > 0) {
        console.log(
            "\nVariantes sin unificar (agrega la correcta a ALIAS en utils/comunas.ts):",
        );
        sinUnificar.forEach((variantes) =>
            console.log(`  ${[...variantes].join(" / ")}`),
        );
    }
}

main()
    .catch((error) => {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
    })
    .finally(() => mongoose.connection.close());
