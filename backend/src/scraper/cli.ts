import { parseArgs } from "node:util";
import { initializeCinemark } from "./client.ts";
import { listCinemas } from "./cinemark.ts";

const HELP = `Scraper Cinemark Chile (Node 24 o superior)

Uso: npm run scrape:cinemark -- [opciones]
  --list-cinemas          Lista ids, nombres y slugs de las sucursales
  --delay=500            Pausa minima entre consultas en milisegundos (minimo 250)
  --help

Este paso solo lista cines. No extrae funciones ni modifica MongoDB.`;

async function main() {
  const { values } = parseArgs({
    options: {
      "list-cinemas": { type: "boolean" },
      delay: { type: "string" }, help: { type: "boolean" },
    },
  });
  if (values.help || !values["list-cinemas"]) { console.log(HELP); return; }
  const integer = (value: string, name: string, minimum = 1) => {
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < minimum) throw new Error(`${name} debe ser un entero >= ${minimum}.`);
    return Number(value);
  };
  await initializeCinemark(integer(values.delay ?? "500", "--delay", 250));
  console.table((await listCinemas()).map((cinema) => ({ id: cinema.id, nombre: cinema.name, slug: cinema.slug })));
}

main().catch((error) => { console.error("Error:", error.message); process.exitCode = 1; });
