import type { MetricasTmdb } from "../tmdb/types.ts";

/**
 * Forma de una fila de base de datos utilizada por la sincronización con TMDB.
 */
export interface MovieRow {
    id: number;
    titulo: string;
    titulo_original?: string | null;
    duracion: number | null;
    tmdb_id: number | null;
    origen_id?: string | null;
}

/**
 * Contadores y resultados acumulados de un diagnóstico TMDB.
 */
export interface DiagnosticSummary {
    revisadas: number;
    seguras: number;
    segurasAplicables: number;
    dudosas: number;
    sinCoincidencia: number;
    errores: number;
    aplicadas: number;
    omitidasPorConflicto: number;
    omitidasPorActualizacionConcurrente: number;
    asignadasManualmente: number;
    omitidasManualmente: number;
    conflictosManuales: number;
    erroresManuales: number;
}

/**
 * Candidato de TMDB que supera los criterios mínimos de coincidencia.
 */
export interface CandidatoSeguro extends MetricasTmdb {
    peliculaId: number;
    tmdbId: number;
    tituloOriginal?: string;
    poster?: string;
    posterLimpio?: string;
    banner?: string;
    sinopsis?: string;
}

/**
 * Estados posibles al evaluar la coincidencia de una película con TMDB.
 */
export type EstadoDiagnostico =
    | "SEGURO"
    | "DUDOSO"
    | "SIN_COINCIDENCIA"
    | "CONFLICTO"
    | "ERROR"
    | "ASIGNADO_MANUALMENTE"
    | "OMITIDO_MANUALMENTE"
    | "CONFLICTO_MANUAL"
    | "ERROR_MANUAL";

/**
 * Decisión adoptada al comparar una película con resultados de TMDB.
 */
export type DecisionDiagnostico =
    | "APLICAR"
    | "REVISAR"
    | "OMITIR"
    | "OMITIR_CONFLICTO"
    | "REVISAR_RESOLUCION";

/**
 * Candidato de TMDB, métricas y decisión obtenidos al diagnosticar una película.
 */
export interface ResultadoDiagnostico {
    peliculaId: number;
    titulo: string;
    estado: EstadoDiagnostico;
    decision: DecisionDiagnostico;
    tipoDetectado: string;
    motivoManual?: string | null;

    tmdbId: number | null;
    tituloTmdb: string | null;
    tituloOriginalTmdb: string | null;
    fechaEstreno: string | null;
    score: number | null;
    consultaCoincidente: string | null;
    coincideConsultaPrincipal: boolean | null;

    duracionLocal: number | null;
    duracionTmdb: number | null;
    diferenciaDuracion: number | null;

    segundoCandidato: string | null;
    segundoTmdbId: number | null;
    segundoTituloOriginal: string | null;
    segundoFechaEstreno: string | null;
    segundoScore: number | null;
    segundoDuracionTmdb: number | null;
    segundaDiferenciaDuracion: number | null;
}
