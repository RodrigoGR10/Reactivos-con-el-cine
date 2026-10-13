import fs from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { initializeCinemark } from "./client.ts";
import { listCinemas, scrapeCinemark } from "./cinemark.ts";
import { isDate, localNow } from "./normalize.ts";

const HELP = `Scraper Cinemark Chile (Node 24 o superior)

Uso: npm run scrape:cinemark -- [opciones]
  --list-cinemas          Lista ids, nombres y slugs de las sucursales
  --cinema=2307           Filtra un id o slug; se puede repetir o separar con comas
  --from=YYYY-MM-DD       Primer dia de cartelera (hoy en Chile por defecto)
  --days=7               Dias de cartelera, contando el primer dia
  --all-dates            Incluye todas las fechas publicadas, incluidas preventas
  --limit=5              Maximo de sesiones por cine, para pruebas pequenas
  --delay=500            Pausa minima entre consultas en milisegundos (minimo 250)
  --output=data/cinemark.json Ruta del JSON generado
  --help

Este paso genera JSON y no modifica MongoDB.
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
  const root = fileURLToPath(new URL("../../", import.meta.url));
  await initializeCinemark(integer(values.delay ?? "500", "--delay", 250));
  if (values["list-cinemas"]) {
    console.table((await listCinemas()).map((cinema) => ({ id: cinema.id, nombre: cinema.name, slug: cinema.slug })));
    return;
  }
  const output = values.output ? resolve(values.output) : resolve(root, "data/cinemark.json");
  if (output.toLowerCase() === resolve(root, "db.json").toLowerCase()) throw new Error("Elige otra salida: db.json contiene los datos existentes.");
  const scrapeStartedAt = Date.now();
  const result = await scrapeCinemark({
    desde, dias, limitePorCine,
    cines: (values.cinema ?? []).flatMap((value) => value.split(",")).map((value) => value.trim()).filter(Boolean),
  });
  console.log(`Tiempo de extraccion: ${((Date.now() - scrapeStartedAt) / 1000).toFixed(1)} s.`);
  fs.mkdirSync(dirname(output), { recursive: true });
  fs.writeFileSync(`${output}.tmp`, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  fs.renameSync(`${output}.tmp`, output);
  console.log(`Guardado: ${output}`);
  console.log(`${result.peliculas.length} peliculas, ${result.cines.length} cines, ${result.funciones.length} opciones de funcion; ${result.incidencias.length} incidencias.`);
  if (!result.meta.completo) {
    console.error("Extraccion parcial. Revisa los avisos y ejecuta nuevamente antes de usar el JSON.");
    process.exitCode = 2;
    return;
  }
}

main().catch((error) => { console.error("Error:", error.message); process.exitCode = 1; });
