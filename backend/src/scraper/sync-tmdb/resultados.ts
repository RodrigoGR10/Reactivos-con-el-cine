import type {
    CandidatoSeguro,
    DiagnosticSummary,
    MovieRow,
    ResultadoDiagnostico,
} from "./types.ts";

export interface Veredicto {
    resultado: ResultadoDiagnostico;
    contador: keyof DiagnosticSummary;
    candidato?: CandidatoSeguro;
}

type CamposResultado = Pick<
    ResultadoDiagnostico,
    "estado" | "decision" | "tipoDetectado"
> &
    Partial<ResultadoDiagnostico>;

export function crearResumenVacio(): DiagnosticSummary {
    return {
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
}

// Resultado "vacío" de una película; cada caso solo indica lo que cambia.
export function crearResultado(
    movie: MovieRow,
    campos: CamposResultado,
): ResultadoDiagnostico {
    return {
        peliculaId: movie.id,
        titulo: movie.titulo,
        motivoManual: null,

        tmdbId: null,
        tituloTmdb: null,
        tituloOriginalTmdb: null,
        fechaEstreno: null,
        score: null,
        consultaCoincidente: null,
        coincideConsultaPrincipal: null,

        duracionLocal: movie.duracion,
        duracionTmdb: null,
        diferenciaDuracion: null,

        segundoCandidato: null,
        segundoTmdbId: null,
        segundoTituloOriginal: null,
        segundoFechaEstreno: null,
        segundoScore: null,
        segundoDuracionTmdb: null,
        segundaDiferenciaDuracion: null,

        ...campos,
    };
}

export function mensajeDeError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}
