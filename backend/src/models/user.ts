import dotenv from "dotenv";
dotenv.config();

/**
 * Datos de cuenta que se guardan para una persona usuaria.
 */
export interface User {
    id: string;
    nombre?: string;
    email: string;
    passwordHash: string;
    creadoEn?: string;
}

/**
 * Relación entre una persona y sus cines favoritos.
 */
export interface UserFavoritosCines {
    userId: string;
    cineId: string;
    creadoEn?: Date;
}

/**
 * Relación entre una persona y sus películas favoritas.
 */
export interface UserFavoritosPeliculas {
    userId: string;
    peliculaId: number;
    creadoEn?: Date;
}

/**
 * Datos de entrada aceptados al guardar registros de la aplicación.
 */
export type CrearUserDTO = Omit<User, "id" | "creadoEn">;
