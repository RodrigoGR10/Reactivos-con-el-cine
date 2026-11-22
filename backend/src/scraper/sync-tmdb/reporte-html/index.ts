import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { DiagnosticSummary, ResultadoDiagnostico } from "../types.ts";
import { construirDocumento } from "./plantilla.ts";

function dosDigitos(n: number): string {
    return String(n).padStart(2, "0");
}

function marcaDeTiempo(): string {
    const now = new Date();

    const fecha = [
        now.getFullYear(),
        dosDigitos(now.getMonth() + 1),
        dosDigitos(now.getDate()),
    ].join("-");

    const hora = [
        dosDigitos(now.getHours()),
        dosDigitos(now.getMinutes()),
        dosDigitos(now.getSeconds()),
    ].join("");

    return `${fecha}-${hora}`;
}

/**
 * Genera un informe HTML navegable con los resultados del diagnóstico TMDB.
 * @param resultados Resultados obtenidos que se incluirán en el informe.
 * @param summary Resumen de conteos y decisiones del diagnóstico.
 * @param apply Indica si se escriben los cambios en la base de datos.
 */
export async function exportarDiagnosticoHtml(
    resultados: ResultadoDiagnostico[],
    summary: DiagnosticSummary,
    apply: boolean,
): Promise<string> {
    const carpeta = resolve(process.cwd(), "reports");
    await mkdir(carpeta, { recursive: true });

    const archivo = resolve(
        carpeta,
        `tmdb-diagnostico-${marcaDeTiempo()}.html`,
    );

    await writeFile(
        archivo,
        construirDocumento(resultados, summary, apply),
        "utf8",
    );

    return archivo;
}
