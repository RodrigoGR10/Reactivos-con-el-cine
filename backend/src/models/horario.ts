/**
 * Representa una función de cine con película, fecha, sala, estado y proveedor.
 */
export interface Horario {
    id: number;
    peliculaId: number;
    cineId: string;
    fechaHora: Date | string;
    formato?: string;
    idioma?: string;
    sala?: string;
    urlCompra?: string;
    creadoEn?: Date;
}

/**
 * Datos necesarios para registrar un horario de función.
 */
export type CrearHorario = Omit<Horario, "id" | "creadoEn">;

// Interfaz para tipar lo que devuelve "vista_cartelera"
/**
 * Fila de cartelera preparada para las consultas de la aplicación.
 */
export interface VistaCarteleraItem {
    horarioId: number;
    fechaHora: Date | string;
    formato?: string;
    idioma?: string;
    sala?: string;
    urlCompra?: string;
    peliculaId: number;
    peliculaTitulo: string;
    posterUrl?: string;
    duracion?: number;
    clasificacion?: string;
    cineId: string;
    cineNombre: string;
    cadena: string;
    comuna: string;
}
