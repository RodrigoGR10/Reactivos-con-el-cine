import type { DatosEstreno } from "../utils/estreno.ts";
import type { Butacas } from "./butacas.ts";

export const ORIGENES = [
    "cinemark",
    "cineplanet",
    "muvix",
    "cinestar",
    "cinepolis",
] as const;
/**
 * Identificador de la cadena o servicio desde el que se extrajeron los datos.
 */
export type Origen = (typeof ORIGENES)[number];

/**
 * Fechas, cines y límites que controlan una ejecución del scraper.
 */
export interface ScrapeOptions {
    desde: string;
    dias: number | null;
    cines: string[];
    limitePorCine: number | null;
}

/**
 * Campos comunes de origen e instante de extracción compartidos por los registros scraped.
 */
export interface SourceRecord {
    id: string;
    origen: Origen;
    origenId: string;
    extraidoEn: string;
}

/**
 * Datos de un cine convertidos al formato compartido por todos los scrapers.
 */
export interface ScrapedCinema extends SourceRecord {
    nombre: string;
    comuna: string;
    ciudad: string;
    direccion: string;
    logo: string;
    url: string;
    latitud?: number;
    longitud?: number;
}

/**
 * Datos normalizados de una película en el modelo común de la aplicación.
 */
export interface ScrapedMovie extends SourceRecord, DatosEstreno {
    titulo: string;
    tituloOriginal?: string;
    duracion: number | null;
    genero: string;
    clasificacion: string;
    sinopsis: string;
    poster: string;
    trailerUrl?: string;
    url?: string;
}

/**
 * Datos normalizados de una función para la cartelera común.
 */
export interface ScrapedSession extends SourceRecord {
    peliculaId: string;
    cineId: string;
    fecha: string;
    fechaCartelera: string;
    horario: string;
    formato: string;
    idioma: string;
    sala: string;
    precio?: number;
    cargoServicio?: number;
    precioOnline: number;
    tipoEntrada: string;
    urlCompra: string;
    agotada: boolean;
}

/**
 * Datos normalizados de una función para la cartelera común.
 */
export interface ScrapedSchedule extends SourceRecord {
    peliculaId: string;
    cineId: string;
    sesionId: string;
    fecha: string;
    fechaCartelera: string;
    horario: string;
    formatoResumen: string;
    idioma: string;
    sala: string;
    agotada: boolean;
    revision: string;
    urlCompra?: string;
    butacas?: Butacas;
}

/**
 * Error o advertencia producido durante una extracción de datos.
 */
export interface Incident {
    cineId?: string;
    peliculaId?: string;
    sesionId?: string;
    etapa: "cine" | "pelicula" | "precio" | "funcion";
    mensaje: string;
}

/**
 * Cines, películas, horarios y estado de completitud de una extracción.
 */
export interface ScrapeResult {
    peliculas: ScrapedMovie[];
    cines: ScrapedCinema[];
    //TO DO: Borrar funciones, ahora el flujo funcionara con horarios
    funciones: ScrapedSession[];

    horarios: ScrapedSchedule[];
    incidencias: Incident[];
    meta: {
        origen: Origen;
        version: 1;
        modo?: "cartelera";
        iniciadoEn: string;
        terminadoEn?: string;
        completo: boolean;
        desde: string;
        dias: number | null;
        limitePorCine: number | null;
        cinesSeleccionados: number;
        cinesDisponibles?: number;
        cinesProcesados: number;
        peliculasConFuncionesFuturas?: string[];
        sesionesConsultadas: number;
        moneda: "CLP";
        zonaHoraria: "America/Santiago";
        precioIncluyeServicio: false;
    };
}
