import dotenv from "dotenv";
dotenv.config();

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

export type CrearCineDTO = Omit<Cine, "creadoEn">;
