import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { sincronizarMetadatosTmdb } from "./sync-tmdb/index.ts";
import { pool } from "../db.ts";
import { importarDatosScraped } from "./import-data.ts";
import { validarScrapeResult } from "./validate.ts";

async function main() {
    const args = process.argv.slice(2);

    if (args.includes("--tmdb")) {
        const dryRun = args.includes("--dry-run");
        const apply = args.includes("--apply");

        if (dryRun === apply) {
            throw new Error(
                "Debes indicar exactamente un modo:\n" +
                    "npm run sync:tmdb -- --dry-run\n" +
                    "npm run sync:tmdb -- --apply",
            );
        }

        await sincronizarMetadatosTmdb({ apply });
        return;
    }

    const jsonPath = args[0];

    if (!jsonPath) {
        throw new Error("Uso: pnpm import:scrape <ruta-al-json>");
    }

    const absolutePath = resolve(process.cwd(), jsonPath);

    console.log(`Leyendo: ${absolutePath}`);

    const rawData = await readFile(absolutePath, "utf8");

    let data: unknown;

    try {
        data = JSON.parse(rawData);
    } catch {
        throw new Error(`El archivo no contiene JSON válido: ${absolutePath}`);
    }

    validarScrapeResult(data);

    console.log(
        `${data.cines.length} cines, ` +
            `${data.peliculas.length} películas, ` +
            `${data.horarios.length} horarios.`,
    );

    if (!data.meta.completo) {
        console.warn(
            "JSON parcial: se importarán los registros, " +
                "pero no se limpiarán horarios anteriores.",
        );
    }

    const summary = await importarDatosScraped(data);

    console.table(summary);
}

main()
    .catch((error: unknown) => {
        console.error("Error de importación:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await pool.end();
    });
