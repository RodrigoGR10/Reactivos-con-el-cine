export interface CinepolisCinema {
  id: string;
  name: string;
  slug: string;
  city: string;
  comuna: string;
  address: string;
  vistaId: string;
  latitude?: number;
  longitude?: number;
}

export interface CinepolisMovie {
  id: string;
  title: string;
  originalTitle?: string;
  slug: string;
  runTime: number;
  genre: string;
  rating: string;
  ratingDescription?: string;
  synopsis: string;
  poster: string;
  releaseDate?: string;
  /** true si faltan datos (duración o póster) y se usaron valores por defecto */
  datosIncompletos?: boolean;
}

export type Proyeccion = "2D" | "3D";

/**
 * api: experiencia informada por Cinépolis.
 * heuristica: inferida por cine, sala o título (menos confiable).
 * por_defecto: sin información; se asume proyección 2D sin experiencia especial.
 */
export type FormatoFuente = "api" | "heuristica" | "por_defecto";

export interface CinepolisShowtime {
  sessionId: string;
  cinemaId: string;
  movieId: string;
  /** Fecha de cartelera (YYYY-MM-DD) */
  date: string;
  /** Fecha-hora tal como la devuelve la API */
  datetime: string | null;
  /** Hora local de Santiago (HH:MM) */
  time: string;
  projection: Proyeccion;
  /** Experiencia normalizada: IMAX, 4DX, VIP, JUNIOR, PLUUS, MACRO XE, etc. o null */
  experience: string | null;
  formatSource: FormatoFuente;
  /** Etiqueta resumida, por ejemplo "2D", "IMAX 3D", "4DX 2D" */
  format: string;
  /** "Doblada", "Subtitulada" u otro valor informado por la API */
  language: string;
  rawLanguage: string | null;
  rawFormat: string | null;
  rawExperience: string | null;
  /** "SALA 4" o cadena vacía */
  screen: string;
  screenNumber: string | null;
  availability: string | null;
  agotada: boolean;
  vistaCinemaId: string | null;
  vistaMovieId: string | null;
  purchaseUrl: string;
}

export interface RawCinepolisShowtime {
  CinemaId: number | string;
  VistaCinemaId: string;
  ShowtimeId: string;
  Time: string;
  TimeFilter?: string;
  ShowtimeAMPM?: string;
}

export interface RawCinepolisFormat {
  Name: string;
  Language: string;
  Showtimes: RawCinepolisShowtime[];
}

export interface RawCinepolisMovie {
  Id: number | string;
  Title: string;
  OriginalTitle?: string;
  Key: string;
  Rating: string;
  RatingDescription?: string;
  RunTime?: string | number;
  Poster?: string;
  Gender?: string;
  Director?: string;
  Distributor?: string;
  Formats?: RawCinepolisFormat[];
}
