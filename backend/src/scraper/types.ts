export interface RawCinema {
  id: number;
  name: string;
  slug: string;
  address: string;
  city: string;
  latitude?: string;
  longitude?: string;
}

export interface RawMovie {
  corporateId: string;
  slug: string;
  title: string;
  runTime: number;
  genres: { name: string }[];
  rating: string;
  synopsis: string;
  posterUrl: string;
}

export interface RawSession {
  corporateId: string;
  theaterId: string;
  theaterRoom: string;
  sessionId: string;
  sessionFormat: string;
  sessionDateTime: string;
  sessionDisplayDate: string;
  language: { name: string };
  occupation?: { availableSeats: number };
}

export interface RawTicket {
  title: string;
  areaCategoryCode: string;
  isPackageTicket?: boolean;
  isBinPromotion?: boolean;
  isThirdPartyMemberTicket?: boolean;
  isPaymentByCreditCardOnly?: boolean;
  partnershipName?: string | null;
  recognitionId?: number | null;
  ticketsQty?: number;
  internalTicketType?: string;
  buyOptions: {
    priceInCents: number;
    totalWithFee: number;
    promoId?: number;
    recogId?: number;
    level?: number;
    type?: number;
  }[];
}

export interface RawPriceGroup {
  title: string;
  tickets: RawTicket[];
}

export const ORIGENES = ["cinemark", "cineplanet", "muvix", "cinestar"] as const;
export type Origen = typeof ORIGENES[number];

export interface SourceRecord {
  id: string;
  origen: Origen;
  origenId: string;
  extraidoEn: string;
}

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

export interface ScrapedMovie extends SourceRecord {
  titulo: string;
  duracion: number;
  genero: string;
  clasificacion: string;
  sinopsis: string;
  poster: string;
  url?: string;
}

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
}

export interface Incident {
  cineId?: string;
  peliculaId?: string;
  sesionId?: string;
  etapa: "cine" | "pelicula" | "precio" | "funcion";
  mensaje: string;
}

export interface ScrapeResult {
  peliculas: ScrapedMovie[];
  cines: ScrapedCinema[];
  funciones: ScrapedSession[];
  horarios?: ScrapedSchedule[];
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
