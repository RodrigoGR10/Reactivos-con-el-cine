import { query, pool } from "../db.ts";
import {
    claveComuna,
    esComunaOficial,
    normalizarComuna,
} from "../utils/comunas.ts";

// Uso: node src/scripts/normalizar-comunas.ts [--write]
// Sin --write solo muestra qué cambiaría.

async function main() {
    const escribir = process.argv.includes("--write");

    const { rows: cines } = await query<{
        id: string;
        nombre: string;
        comuna: string;
    }>("SELECT id, nombre, comuna FROM cines");

    let cambios = 0;
    const finales = new Map<string, Set<string>>();

    for (const cine of cines) {
        const nueva = normalizarComuna(cine.comuna);
        const clave = claveComuna(nueva);

        finales.set(clave, (finales.get(clave) ?? new Set()).add(nueva));

        if (nueva === cine.comuna) continue;

        cambios++;
        console.log(`${cine.nombre}: "${cine.comuna}" -> "${nueva}"`);

        if (escribir) {
            await query("UPDATE cines SET comuna = $1 WHERE id = $2", [
                nueva,
                cine.id,
            ]);
        }
    }

    console.log(
        `\n${cambios} de ${cines.length} cines ${
            escribir ? "actualizados" : "cambiarían (usa --write para guardar)"
        }.`,
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
    .finally(() => pool.end());
