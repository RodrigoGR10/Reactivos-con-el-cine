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
  runTime: number | null;
  genre: string;
  rating: string;
  ratingDescription?: string;
  synopsis: string;
  poster: string;
  trailerUrl?: string;
  releaseDate?: string;
  /** true si falta la duración o el póster y se usó un dato de respaldo. */
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

/** Tipos de la respuesta GraphQL del sitio, previos a cualquier normalización. */
export interface RawGqlMovie {
  id: string;
  name: string;
  originalName?: string;
  genre?: string[] | string;
  rating?: string;
  ratingDescription?: string;
  length?: string | number;
  releaseDate?: string;
  synopsis?: string;
  media?: Array<{
    resource?: string;
    type?: string;
    code?: string;
    sizes?: { large?: string; medium?: string; small?: string };
  }>;
}

export interface RawGqlShowtime {
  format?: { name?: string } | null;
  experience?: { name?: string } | null;
  sessionId: string | number;
  datetime?: string;
  screen?: string | number | null;
  movieVistaId?: string | number | null;
  cinemaVistaId?: string | number | null;
  availability?: string | number | null;
}

export interface RawGqlLanguage {
  language?: string;
  displayLanguage?: string;
  showtimes?: RawGqlShowtime[];
}

export interface RawGqlDate {
  date: string;
  languages?: RawGqlLanguage[];
}

export interface RawGqlSchedule {
  movieId: string;
  dates?: RawGqlDate[];
}

/** Resultado completo devuelto por el script que corre dentro del navegador. */
export interface PageResult {
  movies: RawGqlMovie[];
  errores: Array<{ tipo: string; status?: number; errores?: unknown; texto?: string | null }>;
  billboards: Record<
    string,
    {
      estado: "ok" | "vacio" | "error";
      idUsado: string | null;
      schedules: RawGqlSchedule[];
      intentos: unknown[];
      raw?: unknown;
    }
  >;
}

export interface FormatoSala {
  proyeccion: Proyeccion;
  experiencia: string | null;
  resumen: string;
  fuente: FormatoFuente;
}

export interface FormatoInput {
  formatName?: string | null;
  experienceName?: string | null;
  screen?: string | number | null;
  cinemaId?: string;
  movieSlugOrTitle?: string;
}
