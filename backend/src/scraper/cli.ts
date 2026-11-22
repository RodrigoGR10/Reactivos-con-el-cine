import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { scrapeCinemark } from "./cinemark/scraper.ts";
import { scrapeCineplanet } from "./cineplanet/scraper.ts";
import { initializeCinepolis } from "./cinepolis/client.ts";
import { scrapeCinepolis } from "./cinepolis/scraper.ts";
import { scrapeVista } from "./vista/scraper.ts";

import { importarDatosScraped } from "./import-data.ts";
import { validarScrapeResult } from "./validate.ts";
import { deduplicarCatalogoPeliculas } from "./deduplicar-peliculas.ts";

import { ORIGENES, type Origen, type ScrapeOptions } from "./types.ts";
import { localNow } from "../utils/localNow.ts";
import { pool } from "../db.ts";

type Mode = "scrape" | "sync";

/** Valida el rango de fechas y los límites recibidos por la línea de comandos. */
function validarOpciones(options: ScrapeOptions) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(options.desde)) {
        throw new Error("--desde debe tener formato YYYY-MM-DD");
    }

    const fecha = new Date(`${options.desde}T12:00:00`);
    if (
        Number.isNaN(fecha.getTime()) ||
        fecha.toISOString().slice(0, 10) !== options.desde
    ) {
        throw new Error("--desde no es una fecha válida");
    }

    if (
        options.dias !== null &&
        (!Number.isInteger(options.dias) || options.dias < 1)
    ) {
        throw new Error("--dias debe ser un entero positivo o 'todos'");
    }

    if (
        options.limitePorCine !== null &&
        (!Number.isInteger(options.limitePorCine) || options.limitePorCine < 1)
    ) {
        throw new Error("--limite-por-cine debe ser un entero positivo");
    }
}

/**
 * Ejecuta el scraper indicado, guarda su resultado y opcionalmente lo importa.
 * También permite fusionar duplicados mediante `--deduplicar`.
 */
async function main() {
    const args = process.argv.slice(2);

    // Modo independiente para deduplicar películas.
    if (args.includes("--deduplicar")) {
        const apply = args.includes("--apply");

        await deduplicarCatalogoPeliculas({ apply });
        return;
    }

    const mode: Mode = args.includes("--sync") ? "sync" : "scrape";

    const chainArg = args.find((arg) => arg.startsWith("--chain="));
    const origenArg = chainArg?.slice("--chain=".length) ?? "cinemark";

    if (!ORIGENES.includes(origenArg as Origen)) {
        throw new Error(`Cadena desconocida: ${origenArg}`);
    }

    const origen: Origen = origenArg as Origen;
    const options: ScrapeOptions = {
        desde: localNow().slice(0, 10),
        dias: null,
        cines: args
            .filter(
                (arg) =>
                    arg.startsWith("--cine=") || arg.startsWith("--cinema="),
            )
            .map((arg) => arg.split("=")[1] ?? "")
            .flatMap((value) => value.split(","))
            .map((value) => value.trim())
            .filter(Boolean),
        limitePorCine: null,
    };

    const desdeArg = args.find((arg) => arg.startsWith("--desde="));
    if (desdeArg) options.desde = desdeArg.split("=")[1];

    const diasArg = args.find(
        (arg) => arg.startsWith("--dias=") || arg.startsWith("--days="),
    );
    if (diasArg) {
        const value = diasArg.split("=")[1];
        options.dias = value === "todos" ? null : Number(value);
    }
    if (args.includes("--all-dates")) {
        options.dias = null;
    }

    const limiteArg = args.find((arg) => arg.startsWith("--limite-por-cine="));
    if (limiteArg) {
        options.limitePorCine = Number(limiteArg.split("=")[1]);
    }

    // Validar las opciones definitivas, después de aplicar los argumentos CLI.
    validarOpciones(options);

    console.log(`Iniciando extracción: ${origen}`);

    const scrapers: Record<Origen, () => ReturnType<typeof scrapeCinemark>> = {
        cinemark: () => scrapeCinemark(options),
        cineplanet: () => scrapeCineplanet(options),
        muvix: () => scrapeVista("muvix", options),
        cinestar: () => scrapeVista("cinestar", options),
        cinepolis: async () => {
            await initializeCinepolis();
            return scrapeCinepolis(options);
        },
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
