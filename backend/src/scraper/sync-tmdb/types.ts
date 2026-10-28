export interface MovieRow {
    id: number;
    titulo: string;
    duracion: number | null;
    tmdb_id: number | null;
}

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

export interface CandidatoSeguro {
    peliculaId: number;
    tmdbId: number;
    poster?: string;
    banner?: string;
    sinopsis?: string;
}

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

export type DecisionDiagnostico =
    | "APLICAR"
    | "REVISAR"
    | "OMITIR"
    | "OMITIR_CONFLICTO"
    | "REVISAR_RESOLUCION";

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
