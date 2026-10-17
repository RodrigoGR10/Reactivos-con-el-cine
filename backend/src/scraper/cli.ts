import fs from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { initializeCinemark } from "./client.ts";
import { listCinemas, scrapeCinemark } from "./cinemark.ts";
import { isDate, localNow } from "./normalize.ts";
import dotenv from "dotenv";
import { importCatalog } from "./import-data.ts";
import { initializeCineplanet } from "./cineplanet/client.ts";
import { listCinemas as listCineplanet, scrapeCineplanet } from "./cineplanet/scraper.ts";
import { initializeVista } from "./vista/client.ts";
import { listCinemas as listVista, scrapeVista } from "./vista/scraper.ts";
import { ORIGENES, type Origen } from "./types.ts";

async function main() {
  const { values } = parseArgs({
    options: {
      "list-cinemas": { type: "boolean" }, "all-dates": { type: "boolean" },
      cinema: { type: "string", multiple: true }, from: { type: "string" },
      days: { type: "string" }, limit: { type: "string" }, delay: { type: "string" },
      output: { type: "string" },
      import: { type: "boolean" },
      chain: { type: "string" },
    },
  });
  const chain = (values.chain ?? "cinemark") as Origen;
  if (!ORIGENES.includes(chain)) throw new Error("Cadena desconocida. Usa cinemark, cineplanet, muvix o cinestar.");
  const integer = (value: string, name: string, minimum = 1) => {
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < minimum) throw new Error(`${name} debe ser un entero >= ${minimum}.`);
    return Number(value);
  };
  const desde = values.from ?? localNow().slice(0, 10);
  if (!isDate(desde)) throw new Error("--from debe ser una fecha real YYYY-MM-DD.");
  if (values["all-dates"] && values.days) throw new Error("Usa --days o --all-dates, no ambos.");
  const dias = values["all-dates"] ? null : integer(values.days ?? "7", "--days");
  if (dias !== null && dias > 365) throw new Error("--days no puede superar 365.");
  const limitePorCine = values.limit ? integer(values.limit, "--limit") : null;
  if (values.import && (limitePorCine !== null || values["list-cinemas"])) throw new Error("--import no se combina con --limit o --list-cinemas.");
  const root = fileURLToPath(new URL("../../", import.meta.url));
  if (values.import) {
    dotenv.config({ path: resolve(root, ".env"), quiet: true });
    if (!process.env.MONGODB_URI) throw new Error("Configura MONGODB_URI antes de sincronizar.");
  }
  const delayMs = integer(values.delay ?? "500", "--delay", 250);
  if (chain === "cinemark") await initializeCinemark(delayMs);
  else if (chain === "cineplanet") await initializeCineplanet(delayMs);
  else await initializeVista(chain, delayMs);
  if (values["list-cinemas"]) {
    console.table(chain === "cinemark"
      ? (await listCinemas()).map((cinema) => ({ id: cinema.id, nombre: cinema.name, slug: cinema.slug }))
      : chain === "cineplanet" ? (await listCineplanet()).map((cinema) => ({ id: cinema.ID, nombre: cinema.name, slug: cinema.formattedCinemaName }))
      : (await listVista(chain)).map((cinema) => ({ id: cinema.ID, nombre: cinema.Name })));
    return;
  }
  let output: string | undefined;
  if (values.output) output = resolve(values.output);
  else if (!values.import) output = resolve(root, `data/${chain}.json`);
  if (output?.toLowerCase() === resolve(root, "db.json").toLowerCase()) throw new Error("Elige otra salida: db.json contiene los datos existentes.");
  const scrapeStartedAt = Date.now();
  console.log("Cartelera ligera: peliculas y horarios. Los precios se consultan al abrir un cine y fecha.");
  const scrape = chain === "cinemark" ? scrapeCinemark : chain === "cineplanet" ? scrapeCineplanet : (options: Parameters<typeof scrapeVista>[1]) => scrapeVista(chain, options);
  const result = await scrape({
    desde, dias, limitePorCine,
    cines: (values.cinema ?? []).flatMap((value) => value.split(",")).map((value) => value.trim()).filter(Boolean),
  });
  console.log(`Tiempo de extraccion: ${((Date.now() - scrapeStartedAt) / 1000).toFixed(1)} s.`);
  if (output) {
    fs.mkdirSync(dirname(output), { recursive: true });
    fs.writeFileSync(`${output}.tmp`, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    fs.renameSync(`${output}.tmp`, output);
    console.log(`Guardado: ${output}`);
  }
  console.log(`${result.peliculas.length} peliculas, ${result.cines.length} cines, ${result.horarios?.length ?? 0} horarios; ${result.incidencias.length} incidencias. 0 consultas de precios.`);
  if (!result.meta.completo) {
    process.exitCode = 2;
    if (!values.import || !result.horarios?.length) {
      console.error("Extraccion parcial. MongoDB no se actualizo; revisa los avisos.");
      return;
    }
    console.warn("Se guardaran los horarios validos sin borrar registros anteriores.");
  }
  if (values.import) {
    const importStartedAt = Date.now();
    const summary = await importCatalog(result, process.env.MONGODB_URI!, process.env.MONGODB_NAME ?? "reactivos-cine", {
      sync: result.meta.completo, allowPartial: !result.meta.completo,
    });
    console.log(`Tiempo de guardado en MongoDB: ${((Date.now() - importStartedAt) / 1000).toFixed(1)} s.`);
    console.log(result.meta.completo ? "MongoDB sincronizado:" : "MongoDB actualizado parcialmente (sin borrados):", JSON.stringify(summary));
  }
}

main().catch((error) => { console.error("Error:", error.message); process.exitCode = 1; });
