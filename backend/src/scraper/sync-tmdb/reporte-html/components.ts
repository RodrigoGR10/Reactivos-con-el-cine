import type {
    DiagnosticSummary,
    EstadoDiagnostico,
    ResultadoDiagnostico,
} from "../types.ts";

const URL_FICHA_TMDB = "https://www.themoviedb.org/movie";

const ETIQUETAS_RESUMEN: Record<string, string> = {
    revisadas: "Películas revisadas",
    seguras: "Coincidencias seguras",
    segurasAplicables: "Candidatos aplicables (automáticos y manuales)",
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

const FILTROS_ESTADO: Array<[EstadoDiagnostico, string]> = [
    ["SEGURO", "Seguros"],
    ["DUDOSO", "Dudosos"],
    ["SIN_COINCIDENCIA", "Sin coincidencia"],
    ["CONFLICTO", "Conflictos"],
    ["ERROR", "Errores"],
    ["ASIGNADO_MANUALMENTE", "Asignados manualmente"],
    ["OMITIDO_MANUALMENTE", "Omitidos manualmente"],
    ["CONFLICTO_MANUAL", "Conflictos manuales"],
    ["ERROR_MANUAL", "Errores manuales"],
];

const ENCABEZADOS_TABLA = [
    "ID",
    "Película local",
    "Estado",
    "Decisión",
    "Motivo / resolución manual",
    "TMDB ID",
    "Título TMDB",
    "Año",
    "Local (min)",
    "TMDB (min)",
    "Diferencia (min)",
];

export function escaparHtml(value: unknown): string {
    return String(value ?? "—")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function enlaceTmdb(tmdbId: number | null, textoHtml: string): string {
    if (tmdbId === null) return "—";

    return `<a href="${URL_FICHA_TMDB}/${tmdbId}" target="_blank" rel="noopener noreferrer">${textoHtml}</a>`;
}

function siNo(valor: boolean | null): string {
    if (valor === null) return "—";

    return valor ? "Sí" : "No";
}

function insigniaEstado(estado: string): string {
    return `<span class="badge ${estado.toLowerCase()}">${escaparHtml(estado)}</span>`;
}

export function requiereRevision(r: ResultadoDiagnostico): boolean {
    return r.estado !== "SEGURO" || r.decision !== "APLICAR";
}

// ---------- Resumen y filtros ----------

export function tarjetasResumen(summary: DiagnosticSummary): string {
    return Object.entries(summary)
        .map(([clave, valor]) => {
            const etiqueta = ETIQUETAS_RESUMEN[clave] ?? clave;

            return `<div class="stat"><span>${etiqueta}</span><strong>${valor}</strong></div>`;
        })
        .join("");
}

export function opcionesFiltroEstado(): string {
    const opciones = FILTROS_ESTADO.map(
        ([valor, etiqueta]) => `<option value="${valor}">${etiqueta}</option>`,
    );

    return [`<option value="">Todos los estados</option>`, ...opciones].join(
        "\n",
    );
}

export function encabezadosTabla(): string {
    return ENCABEZADOS_TABLA.map((texto) => `<th>${texto}</th>`).join("");
}

// ---------- Fila de la tabla ----------

export function filaResultado(r: ResultadoDiagnostico): string {
    const anio = r.fechaEstreno?.slice(0, 4);

    return `
        <tr>
            <td>${r.peliculaId}</td>
            <td>${escaparHtml(r.titulo)}</td>
            <td>${insigniaEstado(r.estado)}</td>
            <td>${escaparHtml(r.decision)}</td>
            <td>${escaparHtml(r.motivoManual)}</td>
            <td>${enlaceTmdb(r.tmdbId, String(r.tmdbId))}</td>
            <td>${escaparHtml(r.tituloTmdb)}</td>
            <td>${escaparHtml(anio)}</td>
            <td>${escaparHtml(r.duracionLocal)}</td>
            <td>${escaparHtml(r.duracionTmdb)}</td>
            <td>${escaparHtml(r.diferenciaDuracion)}</td>
        </tr>`;
}

// ---------- Detalle desplegable ----------

function bloqueResolucionManual(r: ResultadoDiagnostico): string {
    if (!r.motivoManual) return "";

    return `
        <h3>Resolución manual</h3>
        <p>${escaparHtml(r.motivoManual)}</p>`;
}

function bloqueCandidatoPrincipal(r: ResultadoDiagnostico): string {
    const ficha = enlaceTmdb(
        r.tmdbId,
        escaparHtml(r.tituloTmdb ?? "Abrir ficha TMDB"),
    );

    return `
        <h3>Candidato principal</h3>
        <dl>
            <dt>TMDB ID</dt><dd>${escaparHtml(r.tmdbId)}</dd>
            <dt>Ficha TMDB</dt><dd>${ficha}</dd>
            <dt>Título original</dt><dd>${escaparHtml(r.tituloOriginalTmdb)}</dd>
            <dt>Estreno</dt><dd>${escaparHtml(r.fechaEstreno)}</dd>
            <dt>Score</dt><dd>${escaparHtml(r.score)}</dd>
            <dt>Consulta utilizada</dt><dd>${escaparHtml(r.consultaCoincidente)}</dd>
            <dt>Coincide con consulta principal</dt>
            <dd>${siNo(r.coincideConsultaPrincipal)}</dd>
        </dl>`;
}

function bloqueDuracion(r: ResultadoDiagnostico): string {
    return `
        <h3>Comparación de duración</h3>
        <dl>
            <dt>Duración local</dt><dd>${escaparHtml(r.duracionLocal)} min</dd>
            <dt>Duración TMDB</dt><dd>${escaparHtml(r.duracionTmdb)} min</dd>
            <dt>Diferencia</dt><dd>${escaparHtml(r.diferenciaDuracion)} min</dd>
        </dl>`;
}

function bloqueSegundoCandidato(r: ResultadoDiagnostico): string {
    if (!r.segundoCandidato) {
        return `
        <h3>Segundo candidato</h3>
        <p>No hay otro candidato relevante.</p>`;
    }

    const ficha = enlaceTmdb(r.segundoTmdbId, "Abrir ficha TMDB");

    return `
        <h3>Segundo candidato</h3>
        <dl>
            <dt>Título</dt><dd>${escaparHtml(r.segundoCandidato)}</dd>
            <dt>TMDB ID</dt><dd>${escaparHtml(r.segundoTmdbId)}</dd>
            <dt>Ficha TMDB</dt><dd>${ficha}</dd>
            <dt>Título original</dt><dd>${escaparHtml(r.segundoTituloOriginal)}</dd>
            <dt>Estreno</dt><dd>${escaparHtml(r.segundoFechaEstreno)}</dd>
            <dt>Score</dt><dd>${escaparHtml(r.segundoScore)}</dd>
            <dt>Duración</dt><dd>${escaparHtml(r.segundoDuracionTmdb)} min</dd>
            <dt>Diferencia</dt><dd>${escaparHtml(r.segundaDiferenciaDuracion)} min</dd>
        </dl>`;
}

export function detalleResultado(r: ResultadoDiagnostico): string {
    return `
        <details class="detail">
            <summary>
                <strong>#${r.peliculaId} — ${escaparHtml(r.titulo)}</strong>
                ${insigniaEstado(r.estado)}
                <span>${escaparHtml(r.decision)}</span>
            </summary>
            <div class="detail-content">
                ${bloqueResolucionManual(r)}
                ${bloqueCandidatoPrincipal(r)}
                ${bloqueDuracion(r)}
                ${bloqueSegundoCandidato(r)}
            </div>
        </details>`;
}
