import { readFileSync } from "fs";
import { resolve } from "path";
import { pool } from "../db.ts";
import { importarDatosScraped } from "./import-data.ts";
import type { ScrapeResult } from "./types.ts";

async function main() {
    const args = process.argv.slice(2);
    const jsonPath = args[0];

    if (!jsonPath) {
        console.error(
            "Error: Debes proporcionar la ruta a un archivo JSON de scraping.",
        );
        console.log("Uso: pnpm tsx src/scraper/import-cli.ts <ruta-al-json>");
        process.exit(1);
    }

    try {
        const absolutePath = resolve(process.cwd(), jsonPath);
        console.log(`Leyendo archivo: ${absolutePath}`);

        const rawData = readFileSync(absolutePath, "utf-8");
        const data: ScrapeResult = JSON.parse(rawData);

        const cines = data.cines ?? [];
        const peliculas = data.peliculas ?? [];
        const funciones = data.funciones ?? [];

        console.log(
            `Datos extraídos: ${cines.length} cines, ${peliculas.length} películas, ${funciones.length} funciones.`,
        );

        if (
            cines.length === 0 &&
            peliculas.length === 0 &&
            funciones.length === 0
        ) {
            console.warn(
                "El archivo JSON no contiene registros para importar.",
            );
            process.exit(0);
        }

        console.log("Iniciando importación a PostgreSQL...");
        await importarDatosScraped(cines, peliculas, funciones);

        console.log("Proceso finalizado correctamente.");
    } catch (error) {
        console.error("Falló la ejecución del CLI de importación:", error);
        process.exit(1);
    } finally {
        // Cerrar el pool de conexiones para permitir que el proceso Node finalice de forma limpia
        await pool.end();
    }
}

main();
