export interface Pelicula {
  id: string;
  titulo: string;
  duracion: number;
  genero: string;
  clasificacion: string;
  sinopsis: string;
  poster: string;
  banner?: string;
}

export interface Cine {
  id: string;
  nombre: string;
  comuna: string;
  logo?: string;
  direccion?: string;
  ciudad?: string;
  latitud?: number;
  longitud?: number;
  url?: string;
  origen?: string;
}

export interface Funcion {
  id: string;
  peliculaId: string;
  cineId: string;
  horario: string;
  formato: string;
  idioma: string;
  precio?: number;
  fecha?: string;
  fechaCartelera?: string;
  sala?: string;
  cargoServicio?: number;
  precioOnline?: number;
  tipoEntrada?: string;
  urlCompra?: string;
  agotada?: boolean;
}

export interface Horario {
  id: string;
  peliculaId: string;
  cineId: string;
  fecha: string;
  fechaCartelera: string;
  horario: string;
  idioma: string;
  sala: string;
  agotada: boolean;
  estadoPrecio: "pendiente" | "consultando" | "disponible" | "desactualizado" | "error" | "sin_tarifa" | "agotada";
  preciosConsultadosEn?: string;
  reintentarEn?: string;
  tarifas: Funcion[];
}
