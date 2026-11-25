/**
 * Categorías que identifican películas, eventos y títulos que no se pueden clasificar.
 */
export type TipoContenido =
    "PELICULA" | "ANIVERSARIO" | "CONCIERTO" | "EVENTO" | "DESCONOCIDO";

/**
 * Puntajes de título, idioma, año y popularidad usados para evaluar una coincidencia.
 */
export interface MetricasTmdb {
    calificacionTmdb?: number;
    votosTmdb?: number;
    popularidadTmdb?: number;
    fechaEstrenoTmdb?: string;
}

/**
 * Metadatos de TMDB preparados para complementar una película del catálogo.
 */
export interface TmdbEnrichment extends MetricasTmdb {
    tmdbId: number;
    tituloOriginal?: string;
    poster?: string;
    posterLimpio?: string;
    banner?: string;
    sinopsis?: string;
}

/**
 * Candidato alternativo de TMDB que se conserva para comparar coincidencias.
 */
export interface SegundoCandidatoTmdb {
    tmdbId: number;
    titulo: string;
    tituloOriginal: string;
    fechaEstreno?: string;
    score: number;
    duracionTmdb?: number;
    diferenciaDuracion?: number;
}

/**
 * Datos de diagnóstico que explican cómo se evaluó un resultado de TMDB.
 */
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
    posterLimpio?: string;
    banner?: string;
    sinopsis?: string;
    consultaCoincidente: string;
    coincideConsultaPrincipal: boolean;
    estado: "SEGURO" | "DUDOSO";
}

/**
 * Metadatos complementarios recuperados desde TMDB para un ID conocido.
 */
export interface TmdbMetadataPorId extends MetricasTmdb {
    tmdbId: number;
    tituloTmdb: string;
    tituloOriginal: string;
    fechaEstreno?: string;
    duracionTmdb?: number;
    poster?: string;
    posterLimpio?: string;
    banner?: string;
    sinopsis?: string;
}

// ---------- Respuestas crudas de la API de TMDB ----------

/**
 * Datos normalizados de una película en el modelo común de la aplicación.
 */
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

/**
 * Imagen del catálogo de afiches o banners de TMDB.
 */
export interface TmdbImageItem {
    file_path: string;
    iso_639_1: string | null;
    width: number;
    height: number;
    aspect_ratio?: number;
    vote_average?: number;
    vote_count?: number;
}

/**
 * Colección de imágenes devuelta por TMDB para una película.
 */
export interface TmdbImagesResponse {
    posters?: TmdbImageItem[];
}

/**
 * Respuesta paginada de búsqueda de películas de TMDB.
 */
export interface TmdbSearchResponse {
    results?: TmdbMovieResult[];
}

/**
 * Datos normalizados de una película en el modelo común de la aplicación.
 */
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
