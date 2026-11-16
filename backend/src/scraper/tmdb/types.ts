export type TipoContenido =
    "PELICULA" | "ANIVERSARIO" | "CONCIERTO" | "EVENTO" | "DESCONOCIDO";

export interface MetricasTmdb {
    calificacionTmdb?: number;
    votosTmdb?: number;
    popularidadTmdb?: number;
    fechaEstrenoTmdb?: string;
}

export interface TmdbEnrichment extends MetricasTmdb {
    tmdbId: number;
    tituloOriginal?: string;
    poster?: string;
    banner?: string;
    sinopsis?: string;
}

export interface SegundoCandidatoTmdb {
    tmdbId: number;
    titulo: string;
    tituloOriginal: string;
    fechaEstreno?: string;
    score: number;
    duracionTmdb?: number;
    diferenciaDuracion?: number;
}

export interface TmdbMatchDiagnostic extends MetricasTmdb {
    tmdbId: number;
    tituloTmdb: string;
    tipoDetectado: TipoContenido;
    tituloOriginal: string;
    fechaEstreno?: string;
    score: number;
    duracionTmdb?: number;
    diferenciaDuracion?: number;
    segundoCandidato?: SegundoCandidatoTmdb;
    poster?: string;
    banner?: string;
    sinopsis?: string;
    consultaCoincidente: string;
    coincideConsultaPrincipal: boolean;
    estado: "SEGURO" | "DUDOSO";
}

export interface TmdbMetadataPorId extends MetricasTmdb {
    tmdbId: number;
    tituloTmdb: string;
    tituloOriginal: string;
    fechaEstreno?: string;
    duracionTmdb?: number;
    poster?: string;
    banner?: string;
    sinopsis?: string;
}

// ---------- Respuestas crudas de la API de TMDB ----------

export interface TmdbMovieResult {
    id: number;
    title: string;
    original_title: string;
    overview: string;
    poster_path: string | null;
    backdrop_path: string | null;
    release_date?: string;
    popularity?: number;
    vote_average?: number;
    vote_count?: number;
}

export interface TmdbSearchResponse {
    results?: TmdbMovieResult[];
}

export interface TmdbMovieDetail {
    id: number;
    title: string;
    original_title: string;
    overview?: string;
    poster_path?: string | null;
    backdrop_path?: string | null;
    release_date?: string;
    runtime?: number | null;
    popularity?: number;
    vote_average?: number;
    vote_count?: number;
}
