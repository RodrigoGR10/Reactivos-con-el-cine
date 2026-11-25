import type { DiagnosticSummary, ResultadoDiagnostico } from "../types.ts";
import { ESTILOS } from "./styles.ts";
import { SCRIPT_FILTROS } from "./client.ts";
import {
    detalleResultado,
    encabezadosTabla,
    filaResultado,
    opcionesFiltroEstado,
    requiereRevision,
    tarjetasResumen,
} from "./components.ts";

/**
 * Arma el documento HTML del informe con su contenido y estilos.
 * @param resultados Resultados obtenidos que se incluirán en el informe.
 * @param summary Resumen de conteos y decisiones del diagnóstico.
 * @param apply Indica si se escriben los cambios en la base de datos.
 * @returns Texto normalizado o generado por la operación.
 */
export function construirDocumento(
    resultados: ResultadoDiagnostico[],
    summary: DiagnosticSummary,
    apply: boolean,
): string {
    const modo = apply ? "APPLY" : "DRY-RUN";
    const generado = new Date().toLocaleString("es-CL");

    const filas = resultados.map(filaResultado).join("");
    const detalles = resultados
        .filter(requiereRevision)
        .map(detalleResultado)
        .join("");

    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Diagnóstico TMDB</title>
<style>
${ESTILOS}
</style>
</head>
<body>
    <h1>Diagnóstico de enriquecimiento TMDB</h1>

    <section class="meta">
        <p><strong>Generado:</strong> ${generado}</p>
        <p><strong>Modo:</strong> ${modo}</p>
        <div class="stats">${tarjetasResumen(summary)}</div>
    </section>

    <section class="panel">
        <h2>Resultados generales</h2>
        <div class="filters">
            <input id="search" placeholder="Buscar película o TMDB ID...">
            <select id="filter">${opcionesFiltroEstado()}</select>
        </div>
        <div class="table-wrapper">
            <table id="results">
                <thead><tr>${encabezadosTabla()}</tr></thead>
                <tbody>${filas}</tbody>
            </table>
        </div>
    </section>

    <section class="panel">
        <h2>Detalles que requieren revisión</h2>
        ${detalles || "<p>No hay películas que requieran revisión manual.</p>"}
    </section>

<script>
${SCRIPT_FILTROS}
</script>
</body>
</html>`;
}
