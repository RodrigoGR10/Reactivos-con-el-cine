import fs from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import dotenv from "dotenv";
import { importCatalog, inspectCatalog, validateResult } from "./import-data.ts";

async function main() {
  const { values } = parseArgs({ options: { file: { type: "string" }, write: { type: "boolean" }, reset: { type: "boolean" }, sync: { type: "boolean" }, status: { type: "boolean" }, help: { type: "boolean" } } });
  if (values.help) {
    console.log("npm run import:cinemark -- [--file=data/cinemark.json] [--write] [--sync] [--reset]\nSin --write solo valida el archivo. --sync retira funciones antiguas del alcance extraido.\n--reset respalda y reemplaza peliculas, cines y funciones; conserva users.\n--status consulta los conteos actuales de MongoDB sin escribir.");
    return;
  }
  const root = fileURLToPath(new URL("../../", import.meta.url));
  if ((values.reset || values.sync) && !values.write) throw new Error("--reset y --sync requieren --write.");
  const mongoConfig = () => {
    dotenv.config({ path: resolve(root, ".env"), quiet: true });
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("Configura MONGODB_URI en backend/.env antes de importar.");
    return { uri, dbName: process.env.MONGODB_NAME ?? "reactivos-cine" };
  };
  if (values.status) {
    const { uri, dbName } = mongoConfig();
    console.log(JSON.stringify(await inspectCatalog(uri, dbName), null, 2));
    return;
  }
  const file = values.file ? resolve(values.file) : resolve(root, "data/cinemark.json");
  const result: unknown = JSON.parse(fs.readFileSync(file, "utf8"));
  validateResult(result);
  console.log(`Archivo valido: ${result.peliculas.length} peliculas, ${result.cines.length} cines, ${result.horarios?.length ?? 0} horarios, ${result.funciones.length} tarifas.`);
  if (!values.write) { console.log("Vista previa. Agrega --write para importar en MongoDB."); return; }
  const { uri, dbName } = mongoConfig();
  const summary = await importCatalog(result, uri, dbName, {
    reset: values.reset, sync: values.sync, backupDirectory: resolve(root, "data/backups"),
  });
  console.log(JSON.stringify(summary, null, 2));
  console.log(values.reset ? "Catalogo reemplazado. Las cuentas de usuario se conservaron." : `${result.meta.origen} importado. Los registros existentes de otras fuentes se conservaron.`);
}

main().catch((error) => { console.error("Error:", error.message); process.exitCode = 1; });
