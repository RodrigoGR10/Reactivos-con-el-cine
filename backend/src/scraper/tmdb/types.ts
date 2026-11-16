export type TipoContenido =
    "PELICULA" | "ANIVERSARIO" | "CONCIERTO" | "EVENTO" | "DESCONOCIDO";

export interface TmdbEnrichment {
    tmdbId: number;
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

export interface TmdbMatchDiagnostic {
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

export interface TmdbMetadataPorId {
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
}
