import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { scrapeCinemark } from "./cinemark/scraper.ts";
import { scrapeCineplanet } from "./cineplanet/scraper.ts";
import { scrapeVista } from "./vista/scraper.ts";

import { importarDatosScraped } from "./import-data.ts";
import { validarScrapeResult } from "./validate.ts";

import type { Origen, ScrapeOptions } from "./types.ts";
import { localNow } from "../utils/localNow.ts";
import { pool } from "../db.ts";

type Mode = "scrape" | "sync";

async function main() {
    const args = process.argv.slice(2);

    const mode: Mode = args.includes("--sync") ? "sync" : "scrape";

    const chainArg = args.find((arg) => arg.startsWith("--chain="));
    const origen = (chainArg?.split("=")[1] ?? "cinemark") as Origen;

    const options: ScrapeOptions = {
        desde: localNow().slice(0, 10),
        dias: 7,
        cines: args
            .filter((arg) => arg.startsWith("--cine="))
            .map((arg) => arg.slice("--cine=".length)),
        limitePorCine: null,
    };

    const desdeArg = args.find((arg) => arg.startsWith("--desde="));
    if (desdeArg) options.desde = desdeArg.split("=")[1];

    const diasArg = args.find((arg) => arg.startsWith("--dias="));
    if (diasArg) {
        const value = diasArg.split("=")[1];
        options.dias = value === "todos" ? null : Number(value);
    }

    const limiteArg = args.find((arg) => arg.startsWith("--limite-por-cine="));
    if (limiteArg) {
        options.limitePorCine = Number(limiteArg.split("=")[1]);
    }

    if (!["cinemark", "cineplanet", "muvix", "cinestar"].includes(origen)) {
        throw new Error(`Cadena desconocida: ${origen}`);
    }

    console.log(`Iniciando extracción: ${origen}`);

    const scrapers = {
        cinemark: () => scrapeCinemark(options),
        cineplanet: () => scrapeCineplanet(options),
        muvix: () => scrapeVista("muvix", options),
        cinestar: () => scrapeVista("cinestar", options),
    };

    const data = await scrapers[origen]();

    validarScrapeResult(data);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    const outputArg = args.find((arg) => arg.startsWith("--output="));

    const outputPath = resolve(
        process.cwd(),
        outputArg
            ? outputArg.slice("--output=".length)
            : `data/scrapes/${origen}-${timestamp}.json`,
    );

    await mkdir(resolve(outputPath, ".."), { recursive: true });

    await writeFile(outputPath, JSON.stringify(data, null, 2), "utf8");

    console.log(`JSON guardado: ${outputPath}`);
    console.log(
        `${data.cines.length} cines, ` +
            `${data.peliculas.length} películas, ` +
            `${data.horarios.length} horarios.`,
    );

    if (!data.meta.completo) {
        console.warn("Extracción parcial: no se considera completa.");
    }

    if (mode === "scrape") {
        console.log("Extracción finalizada. No se importaron datos.");
        return;
    }

    console.log("Importando a PostgreSQL...");

    const summary = await importarDatosScraped(data);

    console.log("Sincronización finalizada:");
    console.table(summary);
}

main()
    .catch((error: unknown) => {
        console.error("Error:", error instanceof Error ? error.message : error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await pool.end();
    });

//Para probar el cli mas adelante, se hace con:
//pnpm tsx src/scraper/import-cli.ts data/cinemark.json
