import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pool } from "../db.ts";
import { importarDatosScraped } from "./import-data.ts";
import type { ScrapeResult } from "./types.ts";

function validarScrapeResult(data: unknown): asserts data is ScrapeResult {
    if (!data || typeof data !== "object") {
        throw new Error("El JSON no contiene un objeto de scraping válido.");
    }

    const result = data as Partial<ScrapeResult>;

    if (
        !Array.isArray(result.cines) ||
        !Array.isArray(result.peliculas) ||
        !Array.isArray(result.horarios) ||
        !Array.isArray(result.incidencias)
    ) {
        throw new Error(
            "El JSON debe contener cines, peliculas, horarios e incidencias como listas.",
        );
    }

    if (
        !result.meta ||
        typeof result.meta.origen !== "string" ||
        typeof result.meta.completo !== "boolean" ||
        typeof result.meta.desde !== "string" ||
        !Number.isInteger(result.meta.cinesSeleccionados) ||
        !Number.isInteger(result.meta.cinesProcesados)
    ) {
        throw new Error("Faltan metadatos obligatorios del scraping.");
    }

    if (
        !["cinemark", "cineplanet", "muvix", "cinestar"].includes(
            result.meta.origen,
        )
    ) {
        throw new Error(`Origen desconocido: ${result.meta.origen}.`);
    }
}

async function main(): Promise<void> {
    const jsonPath = process.argv[2];

    if (!jsonPath) {
        throw new Error(
            "Uso: pnpm tsx src/scraper/import-cli.ts <ruta-al-json>",
        );
    }

    const absolutePath = resolve(process.cwd(), jsonPath);

    console.log(`Leyendo archivo: ${absolutePath}`);

    const rawData = readFileSync(absolutePath, "utf8");
    const data: unknown = JSON.parse(rawData);

    validarScrapeResult(data);

    console.log(
        `Datos recibidos: ${data.cines.length} cines, ` +
            `${data.peliculas.length} películas, ` +
            `${data.horarios.length} horarios.`,
    );

    if (!data.horarios.length && !data.peliculas.length && !data.cines.length) {
        console.warn("El archivo no contiene registros para importar.");
        return;
    }

    if (!data.meta.completo) {
        console.warn(
            "La extracción es parcial. Se importarán los registros válidos, " +
                "pero no se eliminarán horarios anteriores.",
        );
    }

    console.log("Iniciando importación a PostgreSQL...");

    const summary = await importarDatosScraped(data);

    console.log("Importación completada:");
    console.table(summary);
}

main()
    .catch((error: unknown) => {
        console.error(
            "Falló la importación:",
            error instanceof Error ? error.message : error,
        );
        process.exitCode = 1;
    })
    .finally(async () => {
        await pool.end();
    });

//Para probar el cli mas adelante, se hace con:
//pnpm tsx src/scraper/import-cli.ts data/cinemark.json
