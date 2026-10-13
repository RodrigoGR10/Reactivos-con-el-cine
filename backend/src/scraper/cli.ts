import fs from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { initializeCinemark } from "./client.ts";
import { listCinemas, scrapeCinemark } from "./cinemark.ts";
import { isDate, localNow } from "./normalize.ts";
import dotenv from "dotenv";
import { importCinemark } from "./import-data.ts";

const HELP = `Scraper Cinemark Chile (Node 24 o superior)

Uso: npm run scrape:cinemark -- [opciones]
  --list-cinemas          Lista ids, nombres y slugs de las sucursales
  --cinema=2307           Filtra un id o slug; se puede repetir o separar con comas
  --from=YYYY-MM-DD       Primer dia de cartelera (hoy en Chile por defecto)
  --days=7               Dias de cartelera, contando el primer dia
  --all-dates            Incluye todas las fechas publicadas, incluidas preventas
  --limit=5              Maximo de sesiones por cine, para pruebas pequenas
  --delay=500            Pausa minima entre consultas en milisegundos (minimo 250)
  --output=data/cinemark.json Guarda un JSON (opcional al sincronizar)
  --import               Sincroniza MongoDB al completar la extraccion
  --help

Sin --import solo genera JSON. Con --import actualiza MongoDB directamente.
Para guardar tambien un JSON al sincronizar, agrega --output.
Si se interrumpe, ejecuta nuevamente el comando. No modifica backend/db.json.
Precio normal = tarifa adulto/general sin cargo de servicio.
Precio online = tarifa normal + cargo de servicio.`;

async function main() {
  const { values } = parseArgs({
    options: {
      "list-cinemas": { type: "boolean" }, "all-dates": { type: "boolean" },
      cinema: { type: "string", multiple: true }, from: { type: "string" },
      days: { type: "string" }, limit: { type: "string" }, delay: { type: "string" },
      output: { type: "string" }, help: { type: "boolean" },
      import: { type: "boolean" },
    },
  });
  if (values.help) { console.log(HELP); return; }
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
  await initializeCinemark(integer(values.delay ?? "500", "--delay", 250));
  if (values["list-cinemas"]) {
    console.table((await listCinemas()).map((cinema) => ({ id: cinema.id, nombre: cinema.name, slug: cinema.slug })));
    return;
  }
  let output: string | undefined;
  if (values.output) output = resolve(values.output);
  else if (!values.import) output = resolve(root, "data/cinemark.json");
  if (output?.toLowerCase() === resolve(root, "db.json").toLowerCase()) throw new Error("Elige otra salida: db.json contiene los datos existentes.");
  const scrapeStartedAt = Date.now();
  const result = await scrapeCinemark({
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
  console.log(`${result.peliculas.length} peliculas, ${result.cines.length} cines, ${result.funciones.length} opciones de funcion; ${result.incidencias.length} incidencias.`);
  if (!result.meta.completo) {
    console.error("Extraccion parcial. MongoDB no se actualizo; revisa los avisos y ejecuta nuevamente.");
    process.exitCode = 2;
    return;
  }
  if (values.import) {
    const importStartedAt = Date.now();
    const summary = await importCinemark(result, process.env.MONGODB_URI!, process.env.MONGODB_NAME ?? "reactivos-cine", { sync: true });
    console.log(`Tiempo de guardado en MongoDB: ${((Date.now() - importStartedAt) / 1000).toFixed(1)} s.`);
    console.log("MongoDB sincronizado:", JSON.stringify(summary));
  }
}

main().catch((error) => { console.error("Error:", error.message); process.exitCode = 1; });
