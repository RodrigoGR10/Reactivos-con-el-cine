import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pool } from "../db.ts";
import {
    fetchTmdbMovieMetadataById,
    diagnosticarPeliculaTmdb,
    detectarTipoContenido,
} from "./tmdb.ts";

import { resolucionesManuales } from "./resoluciones-tmdb.ts";

function escaparHtml(value: unknown): string {
    return String(value ?? "—")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function generarFechaArchivo(): string {
    const now = new Date();

    const fecha = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0"),
    ].join("-");

    const hora = [
        String(now.getHours()).padStart(2, "0"),
        String(now.getMinutes()).padStart(2, "0"),
        String(now.getSeconds()).padStart(2, "0"),
    ].join("");

    return `${fecha}-${hora}`;
}

async function exportarDiagnosticoHtml(
    resultados: Array<{
        peliculaId: number;
        titulo: string;
        tmdbId: number | null;
        tituloTmdb: string | null;
        score: number | null;
        duracionLocal: number | null;
        duracionTmdb: number | null;
        diferenciaDuracion: number | null;
        segundoDuracionTmdb: number | null;
        segundoTmdbId: number | null;
        segundaDiferenciaDuracion: number | null;
        segundoCandidato: string | null;
        segundoScore: number | null;
        estado: string;
        tipoDetectado: string;
        decision: string;
        consultaCoincidente: string | null;
        coincideConsultaPrincipal: boolean | null;
        tituloOriginalTmdb: string | null;
        fechaEstreno: string | null;
        segundoTituloOriginal: string | null;
        segundoFechaEstreno: string | null;
        motivoManual?: string | null;
    }>,
    summary: DiagnosticSummary,
    apply: boolean,
): Promise<string> {
    const reportDir = resolve(process.cwd(), "reports");
    await mkdir(reportDir, { recursive: true });

    const filename = `tmdb-diagnostico-${generarFechaArchivo()}.html`;
    const filepath = resolve(reportDir, filename);

    const filas = resultados
        .map((r) => {
            const estado = escaparHtml(r.estado);
            const clase = r.estado.toLowerCase();

            return `
            <tr>
                <td>${r.peliculaId}</td>
                <td>${escaparHtml(r.titulo)}</td>
                <td><span class="badge ${clase}">${estado}</span></td>
                <td>${escaparHtml(r.decision)}</td>
                <td>${escaparHtml(r.motivoManual)}</td>
                <td>
                    ${
                        r.tmdbId !== null
                            ? `<a href="https://www.themoviedb.org/movie/${r.tmdbId}"
                                 target="_blank"
                                 rel="noopener noreferrer">
                                 ${r.tmdbId}
                               </a>`
                            : "—"
                    }
                </td>
                <td>${escaparHtml(r.tituloTmdb)}</td>
                <td>${escaparHtml(r.fechaEstreno?.slice(0, 4) ?? "—")}</td>
                <td>${r.duracionLocal ?? "—"}</td>
                <td>${r.duracionTmdb ?? "—"}</td>
                <td>${r.diferenciaDuracion ?? "—"}</td>
            </tr>`;
        })
        .join("");

    const detalles = resultados
        .filter((r) => r.estado !== "SEGURO" || r.decision !== "APLICAR")
        .map(
            (r) => `
            <details class="detail">
                <summary>
                    <strong>#${r.peliculaId} — ${escaparHtml(r.titulo)}</strong>
                    <span class="badge ${r.estado.toLowerCase()}">
                        ${escaparHtml(r.estado)}
                    </span>
                    <span>${escaparHtml(r.decision)}</span>
                </summary>

                <div class="detail-content">
                    ${
                        r.motivoManual
                            ? `
                                    <h3>Resolución manual</h3>
                                    <p>${escaparHtml(r.motivoManual)}</p>
                                    `
                            : ""
                    }

                <h3>Candidato principal</h3>
                    <dl>
                        <dt>TMDB ID</dt><dd>${r.tmdbId ?? "—"}</dd>
                        <dt>Ficha TMDB</dt>
                        <dd>
                            ${
                                r.tmdbId !== null
                                    ? `<a href="https://www.themoviedb.org/movie/${r.tmdbId}"
                                         target="_blank"
                                         rel="noopener noreferrer">
                                         ${escaparHtml(r.tituloTmdb ?? "Abrir ficha TMDB")}
                                       </a>`
                                    : "—"
                            }
                        </dd>
                        <dt>Título original</dt>
                        <dd>${escaparHtml(r.tituloOriginalTmdb)}</dd>

                        <dt>Estreno</dt>
                        <dd>${escaparHtml(r.fechaEstreno)}</dd>

                        <dt>Score</dt>
                        <dd>${r.score ?? "—"}</dd>

                        <dt>Consulta utilizada</dt>
                        <dd>${escaparHtml(r.consultaCoincidente)}</dd>

                        <dt>Coincide con consulta principal</dt>
                        <dd>${
                            r.coincideConsultaPrincipal === null
                                ? "—"
                                : r.coincideConsultaPrincipal
                                  ? "Sí"
                                  : "No"
                        }</dd>
                    </dl>

                    <h3>Comparación de duración</h3>
                    <dl>
                        <dt>Duración local</dt><dd>${r.duracionLocal ?? "—"} min</dd>
                        <dt>Duración TMDB</dt><dd>${r.duracionTmdb ?? "—"} min</dd>
                        <dt>Diferencia</dt><dd>${r.diferenciaDuracion ?? "—"} min</dd>
                    </dl>


                    <h3>Segundo candidato</h3>
                    ${
                        r.segundoCandidato
                            ? `
                        <dl>
                            <dt>Título</dt><dd>${escaparHtml(r.segundoCandidato)}</dd>
                            <dt>TMDB ID</dt><dd>${r.segundoTmdbId ?? "—"}</dd>
                            <dt>Ficha TMDB</dt>
                            <dd>
                                ${
                                    r.segundoTmdbId !== null
                                        ? `<a href="https://www.themoviedb.org/movie/${r.segundoTmdbId}"
                                             target="_blank"
                                             rel="noopener noreferrer">
                                             Abrir ficha TMDB
                                           </a>`
                                        : "—"
                                }
                            </dd>
                            <dt>Título original</dt><dd>${escaparHtml(r.segundoTituloOriginal)}</dd>
                            <dt>Estreno</dt><dd>${escaparHtml(r.segundoFechaEstreno)}</dd>
                            <dt>Score</dt><dd>${r.segundoScore ?? "—"}</dd>
                            <dt>Duración</dt><dd>${r.segundoDuracionTmdb ?? "—"} min</dd>
                            <dt>Diferencia</dt><dd>${r.segundaDiferenciaDuracion ?? "—"} min</dd>
                        </dl>
                    `
                            : "<p>No hay otro candidato relevante.</p>"
                    }

                </div>
            </details>
        `,
        )
        .join("");

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Diagnóstico TMDB</title>
<style>
    body {
        font-family: system-ui, sans-serif;
        margin: 32px auto;
        padding: 0 20px;
        max-width: 1500px;
        background: #f5f6f8;
        color: #20242b;
    }
    h1, h2, h3 { color: #20242b; }
    .meta, .panel {
        background: white;
        border: 1px solid #ddd;
        border-radius: 10px;
        padding: 18px;
        margin-bottom: 20px;
    }
    .stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 12px;
    }

    .stat {
        min-width: 0;
        box-sizing: border-box;
        overflow-wrap: anywhere;
        padding: 14px;
        background: #f3f4f6;
        border-radius: 9px;
    }

    .stat span {
        display: block;
        font-size: 14px;
        line-height: 1.35;
        overflow-wrap: anywhere;
    }
    .stat strong {
        display: block;
        font-size: 25px;
    }
    .table-wrapper { overflow-x: auto; }
    table {
        width: 100%;
        border-collapse: collapse;
        white-space: nowrap;
        font-size: 14px;
    }
    th, td {
        padding: 10px 12px;
        border-bottom: 1px solid #e5e7eb;
        text-align: left;
    }
    th { background: #f0f1f4; }
    tr:hover { background: #f8f9fb; }
    .badge {
        display: inline-block;
        border-radius: 20px;
        padding: 4px 9px;
        font-size: 12px;
        font-weight: 700;
    }
    .seguro { background: #d9f5e3; color: #176438; }
    .dudoso { background: #fff0c2; color: #795500; }
    .sin_coincidencia, .conflicto, .error {
        background: #ffe0e0;
        color: #982b2b;
    }
    .detail {
        background: white;
        border: 1px solid #ddd;
        border-radius: 8px;
        margin: 10px 0;
    }
    .asignado_manualmente {
        background: #d9f5e3;
        color: #176438;
    }

    .omitido_manualmente {
        background: #e5e7eb;
        color: #374151;
    }

    .conflicto_manual,
    .error_manual {
        background: #ffe0e0;
        color: #982b2b;
    }
    summary {
        cursor: pointer;
        padding: 14px;
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 12px;
    }
    .detail-content {
        padding: 0 20px 18px;
        border-top: 1px solid #eee;
    }
    dl {
        display: grid;
        grid-template-columns: minmax(180px, 230px) 1fr;
        gap: 8px;
    }
    dt { color: #626a75; }
    dd { margin: 0; font-weight: 600; }
    .filters { margin-bottom: 14px; }
    input, select {
        padding: 9px;
        border: 1px solid #ccc;
        border-radius: 6px;
        margin-right: 8px;
    }
</style>
</head>
<body>
    <h1>Diagnóstico de enriquecimiento TMDB</h1>

    <section class="meta">
        <p><strong>Generado:</strong> ${new Date().toLocaleString("es-CL")}</p>
        <p><strong>Modo:</strong> ${apply ? "APPLY" : "DRY-RUN"}</p>
        <div class="stats">
            ${Object.entries(summary)
                .map(([key, value]) => {
                    const labels: Record<string, string> = {
                        revisadas: "Películas revisadas",
                        seguras: "Coincidencias seguras",
                        segurasAplicables:
                            "Candidatos aplicables (automáticos y manuales)",
                        dudosas: "Coincidencias dudosas",
                        sinCoincidencia: "Sin coincidencia",
                        errores: "Errores",
                        aplicadas: "Aplicadas",
                        omitidasPorConflicto: "Omitidas por conflicto",
                        omitidasPorActualizacionConcurrente:
                            "Omitidas por actualización concurrente",
                        asignadasManualmente: "Asignadas manualmente",
                        omitidasManualmente: "Omitidas manualmente",
                        conflictosManuales: "Conflictos manuales",
                        erroresManuales: "Errores manuales",
                    };

                    return `
                <div class="stat">
                    <span>${labels[key] ?? key}</span>
                    <strong>${value}</strong>
                </div>
            `;
                })
                .join("")}
        </div>
    </section>

    <section class="panel">
        <h2>Resultados generales</h2>
        <div class="filters">
            <input id="search" placeholder="Buscar película o TMDB ID...">
            <select id="filter">
                <option value="">Todos los estados</option>
                <option value="SEGURO">Seguros</option>
                <option value="DUDOSO">Dudosos</option>
                <option value="SIN_COINCIDENCIA">Sin coincidencia</option>
                <option value="CONFLICTO">Conflictos</option>
                <option value="ERROR">Errores</option>
                <option value="ASIGNADO_MANUALMENTE">Asignados manualmente</option>
                <option value="OMITIDO_MANUALMENTE">Omitidos manualmente</option>
                <option value="CONFLICTO_MANUAL">Conflictos manuales</option>
                <option value="ERROR_MANUAL">Errores manuales</option>
            </select>
        </div>
        <div class="table-wrapper">
            <table id="results">
                <thead>
                    <tr>
                    <th>ID</th>
                    <th>Película local</th>
                    <th>Estado</th>
                    <th>Decisión</th>
                    <th>Motivo / resolución manual</th>
                    <th>TMDB ID</th>
                    <th>Título TMDB</th>
                    <th>Año</th>
                    <th>Local (min)</th>
                    <th>TMDB (min)</th>
                    <th>Diferencia (min)</th>
                    </tr>
                </thead>
                <tbody>${filas}</tbody>
            </table>
        </div>
    </section>

    <section class="panel">
        <h2>Detalles que requieren revisión</h2>
        ${detalles || "<p>No hay películas que requieran revisión manual.</p>"}
    </section>

<script>
    const search = document.getElementById("search");
    const filter = document.getElementById("filter");
    const rows = [...document.querySelectorAll("#results tbody tr")];

    function applyFilters() {
        const term = search.value.toLowerCase();
        const status = filter.value;

        rows.forEach(row => {
            const matchesText = row.textContent.toLowerCase().includes(term);
            const matchesStatus =
                !status ||
                row.children[2].textContent.trim() === status;
            row.hidden = !(matchesText && matchesStatus);
        });
    }

    search.addEventListener("input", applyFilters);
    filter.addEventListener("change", applyFilters);
</script>
</body>
</html>`;

    await writeFile(filepath, html, "utf8");

    return filepath;
}

function normalizarTitulo(titulo: string): string {
    return titulo
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .replace(/[\[(]\d{4}[\])]/g, "")
        .replace(/\b(4K|3D|2D|IMAX|XD)\b/g, "")
        .replace(/[^A-Z0-9]/g, "");
}

export async function sincronizarMetadatosTmdb(
    options: { apply?: boolean } = {},
) {
    const apply = options.apply === true;

    const summary: DiagnosticSummary = {
        revisadas: 0,
        seguras: 0,
        segurasAplicables: 0,
        dudosas: 0,
        sinCoincidencia: 0,
        errores: 0,
        aplicadas: 0,
        omitidasPorConflicto: 0,
        omitidasPorActualizacionConcurrente: 0,
        asignadasManualmente: 0,
        omitidasManualmente: 0,
        conflictosManuales: 0,
        erroresManuales: 0,
    };

    // Solo diagnosticar películas que todavía no tienen TMDB ID.
    const result = await pool.query<MovieRow>(`
        SELECT id, titulo, duracion, tmdb_id
        FROM peliculas
        WHERE tmdb_id IS NULL
        ORDER BY id;
    `);

    const movies = result.rows;

    const moviesById = new Map(movies.map((movie) => [movie.id, movie]));

    const resolucionesPorId = new Map<
        number,
        (typeof resolucionesManuales)[number]
    >();
    const resolucionesInvalidas = new Map<number, string>();

    for (const resolucion of resolucionesManuales) {
        const { peliculaId, tmdbId, motivo } = resolucion;

        if (!Number.isSafeInteger(peliculaId) || peliculaId <= 0) {
            console.error(
                `Resolución manual con peliculaId inválido: ${peliculaId}`,
            );
            continue;
        }

        if (resolucionesPorId.has(peliculaId)) {
            resolucionesInvalidas.set(
                peliculaId,
                "Hay más de una resolución manual para esta película.",
            );
            continue;
        }

        resolucionesPorId.set(peliculaId, resolucion);

        if (
            !moviesById.has(peliculaId) ||
            (tmdbId !== null &&
                (!Number.isSafeInteger(tmdbId) || tmdbId <= 0)) ||
            typeof motivo !== "string" ||
            !motivo.trim()
        ) {
            resolucionesInvalidas.set(
                peliculaId,
                "La resolución manual tiene un ID inexistente o inválido, o no tiene un motivo.",
            );
        }
    }

    console.log(`Películas pendientes de TMDB: ${movies.length}`);
    console.log(
        apply
            ? "MODO APPLY: se actualizarán únicamente coincidencias seguras."
            : "MODO DRY-RUN: no se modificarán datos.",
    );

    const candidatos: CandidatoSeguro[] = [];

    const resultados: Array<{
        peliculaId: number;
        titulo: string;
        tmdbId: number | null;
        tituloTmdb: string | null;
        score: number | null;
        duracionLocal: number | null;
        duracionTmdb: number | null;
        diferenciaDuracion: number | null;
        segundoDuracionTmdb: number | null;
        segundoTmdbId: number | null;
        segundaDiferenciaDuracion: number | null;
        segundoCandidato: string | null;
        segundoScore: number | null;
        estado: string;
        tipoDetectado: string;
        decision: string;
        consultaCoincidente: string | null;
        coincideConsultaPrincipal: boolean | null;
        tituloOriginalTmdb: string | null;
        fechaEstreno: string | null;
        segundoTituloOriginal: string | null;
        segundoFechaEstreno: string | null;
        motivoManual?: string | null;
    }> = [];

    const generarReporte = async () => {
        const reportPath = await exportarDiagnosticoHtml(
            resultados,
            summary,
            apply,
        );

        console.log("\n===== REPORTE HTML GENERADO =====");
        console.log(`Reporte ubicado en: ${reportPath}`);
    };

    for (const movie of movies) {
        summary.revisadas++;

        try {
            const tipoDetectado = detectarTipoContenido(movie.titulo);

            const resolucion = resolucionesPorId.get(movie.id);

            if (resolucion) {
                const motivo = resolucionesInvalidas.get(movie.id);

                if (motivo) {
                    summary.erroresManuales++;

                    resultados.push({
                        peliculaId: movie.id,
                        titulo: movie.titulo,
                        tmdbId: resolucion.tmdbId,
                        tituloTmdb: null,
                        score: null,
                        duracionLocal: movie.duracion,
                        duracionTmdb: null,
                        diferenciaDuracion: null,
                        segundoDuracionTmdb: null,
                        segundoTmdbId: null,
                        segundaDiferenciaDuracion: null,
                        segundoCandidato: null,
                        segundoScore: null,
                        estado: "ERROR_MANUAL",
                        tipoDetectado: detectarTipoContenido(movie.titulo),
                        decision: "REVISAR_RESOLUCION",
                        consultaCoincidente: null,
                        coincideConsultaPrincipal: null,
                        tituloOriginalTmdb: null,
                        fechaEstreno: null,
                        segundoTituloOriginal: null,
                        segundoFechaEstreno: null,
                        motivoManual: motivo,
                    });

                    continue;
                }

                if (resolucion.tmdbId === null) {
                    summary.omitidasManualmente++;

                    resultados.push({
                        peliculaId: movie.id,
                        titulo: movie.titulo,
                        tmdbId: null,
                        tituloTmdb: null,
                        score: null,
                        duracionLocal: movie.duracion,
                        duracionTmdb: null,
                        diferenciaDuracion: null,
                        segundoDuracionTmdb: null,
                        segundoTmdbId: null,
                        segundaDiferenciaDuracion: null,
                        segundoCandidato: null,
                        segundoScore: null,
                        estado: "OMITIDO_MANUALMENTE",
                        tipoDetectado: detectarTipoContenido(movie.titulo),
                        decision: "OMITIR",
                        consultaCoincidente: null,
                        coincideConsultaPrincipal: null,
                        tituloOriginalTmdb: null,
                        fechaEstreno: null,
                        segundoTituloOriginal: null,
                        segundoFechaEstreno: null,
                        motivoManual: resolucion.motivo,
                    });

                    continue;
                }

                try {
                    const metadata = await fetchTmdbMovieMetadataById(
                        resolucion.tmdbId,
                    );

                    if (!metadata) {
                        throw new Error(
                            `TMDB no encontró el ID ${resolucion.tmdbId}.`,
                        );
                    }

                    candidatos.push({
                        peliculaId: movie.id,
                        tmdbId: metadata.tmdbId,
                        poster: metadata.poster,
                        banner: metadata.banner,
                        sinopsis: metadata.sinopsis,
                    });

                    summary.asignadasManualmente++;

                    resultados.push({
                        peliculaId: movie.id,
                        titulo: movie.titulo,
                        tmdbId: metadata.tmdbId,
                        tituloTmdb: metadata.tituloTmdb,
                        tituloOriginalTmdb: metadata.tituloOriginal,
                        fechaEstreno: metadata.fechaEstreno ?? null,
                        score: null,
                        duracionLocal: movie.duracion,
                        duracionTmdb: metadata.duracionTmdb ?? null,
                        diferenciaDuracion:
                            movie.duracion !== null &&
                            metadata.duracionTmdb !== undefined
                                ? Math.abs(
                                      movie.duracion - metadata.duracionTmdb,
                                  )
                                : null,
                        segundoDuracionTmdb: null,
                        segundoTmdbId: null,
                        segundaDiferenciaDuracion: null,
                        segundoCandidato: null,
                        segundoScore: null,
                        estado: "ASIGNADO_MANUALMENTE",
                        tipoDetectado: detectarTipoContenido(movie.titulo),
                        decision: "APLICAR",
                        consultaCoincidente: null,
                        coincideConsultaPrincipal: null,
                        segundoTituloOriginal: null,
                        segundoFechaEstreno: null,
                        motivoManual: resolucion.motivo,
                    });
                } catch (error) {
                    summary.erroresManuales++;

                    resultados.push({
                        peliculaId: movie.id,
                        titulo: movie.titulo,
                        tmdbId: resolucion.tmdbId,
                        tituloTmdb: null,
                        score: null,
                        duracionLocal: movie.duracion,
                        duracionTmdb: null,
                        diferenciaDuracion: null,
                        segundoDuracionTmdb: null,
                        segundoTmdbId: null,
                        segundaDiferenciaDuracion: null,
                        segundoCandidato: null,
                        segundoScore: null,
                        estado: "ERROR_MANUAL",
                        tipoDetectado: detectarTipoContenido(movie.titulo),
                        decision: "REVISAR_RESOLUCION",
                        consultaCoincidente: null,
                        coincideConsultaPrincipal: null,
                        tituloOriginalTmdb: null,
                        fechaEstreno: null,
                        segundoTituloOriginal: null,
                        segundoFechaEstreno: null,
                        motivoManual:
                            error instanceof Error
                                ? error.message
                                : String(error),
                    });
                }

                continue;
            }

            const diagnostic = await diagnosticarPeliculaTmdb(
                movie.titulo,
                undefined,
                movie.duracion,
            );
            if (!diagnostic) {
                summary.sinCoincidencia++;

                resultados.push({
                    peliculaId: movie.id,
                    titulo: movie.titulo,
                    tmdbId: null,
                    tituloTmdb: null,
                    score: null,
                    segundoCandidato: null,
                    segundoScore: null,
                    estado: "SIN_COINCIDENCIA",
                    tipoDetectado,
                    decision: "REVISAR",
                    consultaCoincidente: null,
                    coincideConsultaPrincipal: null,
                    tituloOriginalTmdb: null,
                    fechaEstreno: null,
                    segundoTituloOriginal: null,
                    segundoFechaEstreno: null,
                    duracionLocal: movie.duracion,
                    duracionTmdb: null,
                    diferenciaDuracion: null,
                    segundoDuracionTmdb: null,
                    segundaDiferenciaDuracion: null,
                    segundoTmdbId: null,
                });
            } else {
                const seguro =
                    diagnostic.estado === "SEGURO" &&
                    diagnostic.tipoDetectado === "DESCONOCIDO" &&
                    tipoDetectado === "DESCONOCIDO";

                if (seguro) {
                    summary.seguras++;

                    candidatos.push({
                        peliculaId: movie.id,
                        tmdbId: diagnostic.tmdbId,
                        poster: diagnostic.poster,
                        banner: diagnostic.banner,
                        sinopsis: diagnostic.sinopsis,
                    });
                } else {
                    summary.dudosas++;
                }

                resultados.push({
                    peliculaId: movie.id,
                    titulo: movie.titulo,
                    tmdbId: diagnostic.tmdbId,
                    tituloTmdb: diagnostic.tituloTmdb,
                    tituloOriginalTmdb: diagnostic.tituloOriginal,
                    fechaEstreno: diagnostic.fechaEstreno ?? null,
                    score: diagnostic.score,
                    segundoCandidato:
                        diagnostic.segundoCandidato?.titulo ?? null,
                    segundoTituloOriginal:
                        diagnostic.segundoCandidato?.tituloOriginal ?? null,
                    segundoFechaEstreno:
                        diagnostic.segundoCandidato?.fechaEstreno ?? null,
                    segundoScore: diagnostic.segundoCandidato?.score ?? null,
                    estado: seguro ? "SEGURO" : "DUDOSO",
                    tipoDetectado,
                    decision: seguro ? "APLICAR" : "REVISAR",
                    consultaCoincidente:
                        diagnostic?.consultaCoincidente ?? null,
                    coincideConsultaPrincipal:
                        diagnostic?.coincideConsultaPrincipal ?? null,
                    duracionLocal: movie.duracion,
                    duracionTmdb: diagnostic.duracionTmdb ?? null,
                    diferenciaDuracion: diagnostic.diferenciaDuracion ?? null,
                    segundoDuracionTmdb:
                        diagnostic.segundoCandidato?.duracionTmdb ?? null,
                    segundaDiferenciaDuracion:
                        diagnostic.segundoCandidato?.diferenciaDuracion ?? null,
                    segundoTmdbId: diagnostic.segundoCandidato?.tmdbId ?? null,
                });
            }
        } catch (error) {
            summary.errores++;

            console.error(
                `Error en película ${movie.id}:`,
                error instanceof Error ? error.message : error,
            );

            resultados.push({
                peliculaId: movie.id,
                titulo: movie.titulo,
                tmdbId: null,
                tituloTmdb: null,
                score: null,
                segundoCandidato: null,
                segundoScore: null,
                estado: "ERROR",
                tipoDetectado: detectarTipoContenido(movie.titulo),
                decision: "REVISAR",
                consultaCoincidente: null,
                coincideConsultaPrincipal: null,
                tituloOriginalTmdb: null,
                fechaEstreno: null,
                segundoTituloOriginal: null,
                segundoFechaEstreno: null,
                duracionLocal: movie.duracion,
                duracionTmdb: null,
                diferenciaDuracion: null,
                segundoDuracionTmdb: null,
                segundaDiferenciaDuracion: null,
                segundoTmdbId: null,
            });
        }

        await new Promise((resolve) => setTimeout(resolve, 250));
    }

    // Los registros locales pueden compartir TMDB ID.
    // Esto es informativo y nunca provoca una fusión.
    const grupos = new Map<number, number[]>();

    for (const candidato of candidatos) {
        const grupo = grupos.get(candidato.tmdbId) ?? [];
        grupo.push(candidato.peliculaId);
        grupos.set(candidato.tmdbId, grupo);
    }

    console.log("\n===== TMDB COMPARTIDOS =====");

    for (const [tmdbId, peliculaIds] of grupos) {
        if (peliculaIds.length > 1) {
            console.log(
                `TMDB ${tmdbId}: películas locales ${peliculaIds.join(", ")}. ` +
                    "Se conservarán como registros independientes.",
            );
        }
    }
    const tmdbIds = [...new Set(candidatos.map((c) => c.tmdbId))];

    const existentes =
        tmdbIds.length > 0
            ? await pool.query<{
                  id: number;
                  titulo: string;
                  tmdb_id: number;
              }>(
                  `
              SELECT id, titulo, tmdb_id
              FROM peliculas
              WHERE tmdb_id = ANY($1::int[]);
              `,
                  [tmdbIds],
              )
            : { rows: [] };

    const conflictos = new Set<number>();

    for (const [tmdbId, candidatosMismoTmdb] of grupos) {
        if (candidatosMismoTmdb.length < 2) continue;

        const peliculasDelGrupo = candidatosMismoTmdb
            .map((peliculaId) => moviesById.get(peliculaId))
            .filter((movie): movie is MovieRow => Boolean(movie));

        for (let i = 0; i < peliculasDelGrupo.length; i++) {
            for (let j = i + 1; j < peliculasDelGrupo.length; j++) {
                const a = peliculasDelGrupo[i]!;
                const b = peliculasDelGrupo[j]!;

                if (normalizarTitulo(a.titulo) !== normalizarTitulo(b.titulo)) {
                    conflictos.add(a.id);
                    conflictos.add(b.id);

                    console.warn(
                        `Conflicto entre candidatos para TMDB ${tmdbId}: ` +
                            `"${a.titulo}" (ID ${a.id}) y "${b.titulo}" (ID ${b.id}).`,
                    );
                }
            }
        }
    }

    for (const existente of existentes.rows) {
        const candidatosMismoTmdb = candidatos.filter(
            (c) => c.tmdbId === existente.tmdb_id,
        );

        for (const candidato of candidatosMismoTmdb) {
            const peliculaNueva = movies.find(
                (m) => m.id === candidato.peliculaId,
            );

            if (!peliculaNueva) continue;

            const tituloExistente = normalizarTitulo(existente.titulo);
            const tituloNuevo = normalizarTitulo(peliculaNueva.titulo);

            const titulosCompatibles =
                tituloExistente.length > 0 &&
                tituloNuevo.length > 0 &&
                tituloExistente === tituloNuevo;

            if (!titulosCompatibles) {
                conflictos.add(candidato.peliculaId);

                console.warn(
                    `Conflicto TMDB ${existente.tmdb_id}: ` +
                        `"${peliculaNueva.titulo}" (ID ${peliculaNueva.id}) ` +
                        `frente a "${existente.titulo}" (ID ${existente.id})`,
                );
            }
        }
    }

    const candidatosAplicables = candidatos.filter((c) => {
        if (conflictos.has(c.peliculaId)) {
            summary.omitidasPorConflicto++;
            return false;
        }

        return true;
    });

    summary.segurasAplicables = candidatosAplicables.length;

    for (const resultado of resultados) {
        if (conflictos.has(resultado.peliculaId)) {
            const eraManual = resultado.estado === "ASIGNADO_MANUALMENTE";

            resultado.decision = "OMITIR_CONFLICTO";
            resultado.estado = eraManual ? "CONFLICTO_MANUAL" : "CONFLICTO";

            if (eraManual) {
                summary.conflictosManuales++;
            }
        }
    }

    // DRY-RUN termina aquí: no abre una transacción ni ejecuta UPDATE.
    if (!apply) {
        await generarReporte();
        console.log("\n===== RESUMEN DRY-RUN =====");
        console.table(summary);

        return { summary, resultados };
    }
    if (candidatosAplicables.length === 0) {
        console.log("No hay coincidencias seguras para aplicar.");

        await generarReporte();

        console.table(summary);
        return { summary, resultados };
    }

    // Las llamadas a TMDB ya terminaron. Ahora comienza la transacción.
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        for (const candidato of candidatosAplicables) {
            const update = await client.query(
                `
                UPDATE peliculas
                SET
                    tmdb_id = $1,
                    imagen_url = COALESCE(
                        NULLIF(BTRIM(imagen_url), ''),
                        $2
                    ),
                    banner = COALESCE(
                        NULLIF(BTRIM(banner), ''),
                        $3
                    ),
                    sinopsis = COALESCE(
                        NULLIF(BTRIM(sinopsis), ''),
                        $4
                    )
                WHERE id = $5
                  AND tmdb_id IS NULL;
                `,
                [
                    candidato.tmdbId,
                    candidato.poster ?? null,
                    candidato.banner ?? null,
                    candidato.sinopsis ?? null,
                    candidato.peliculaId,
                ],
            );

            if (update.rowCount === 1) {
                summary.aplicadas++;
            } else {
                summary.omitidasPorActualizacionConcurrente++;

                console.warn(
                    `Película ${candidato.peliculaId}: no se actualizó. ` +
                        "El registro pudo haber sido modificado por otro proceso.",
                );
            }
        }

        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }

    await generarReporte();

    console.log("\n===== RESUMEN APPLY =====");
    console.table(summary);

    return { summary, resultados };
}
