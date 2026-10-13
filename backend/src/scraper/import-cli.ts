import fs from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { validateResult } from "./import-data.ts";

async function main() {
  const { values } = parseArgs({ options: { file: { type: "string" }, help: { type: "boolean" } } });
  if (values.help) {
    console.log("npm run import:cinemark -- [--file=data/cinemark.json]\nEste paso solo valida el archivo y no se conecta a MongoDB.");
    return;
  }
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const file = values.file ? resolve(values.file) : resolve(root, "data/cinemark.json");
  const result: unknown = JSON.parse(fs.readFileSync(file, "utf8"));
  validateResult(result);
  console.log(`Archivo valido: ${result.peliculas.length} peliculas, ${result.cines.length} cines, ${result.funciones.length} funciones.`);
  console.log("Vista previa. Todavia no se importan datos en MongoDB.");
}

main().catch((error) => { console.error("Error:", error.message); process.exitCode = 1; });
