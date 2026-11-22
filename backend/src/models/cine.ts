/**
 * Representa un cine guardado en PostgreSQL, junto con su ubicación y datos de origen.
 */
export interface Cine {
    id: string;
    nombre: string;
    direccion: string;
    comuna: string;
    ciudad?: string;
    cadena: string;
    origenId?: string;
    url?: string;
    logoUrl?: string;
    latitud?: number;
    longitud?: number;
    creadoEn?: Date;
}

/**
 * Datos que se pueden enviar para registrar o actualizar un cine.
 */
export type CrearCineDTO = Omit<Cine, "creadoEn">;
