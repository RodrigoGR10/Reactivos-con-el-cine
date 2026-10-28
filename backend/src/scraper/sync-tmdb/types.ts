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
