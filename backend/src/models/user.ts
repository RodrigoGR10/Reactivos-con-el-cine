import dotenv from "dotenv";
dotenv.config();

export interface User {
    id: string;
    nombre?: string;
    email: string;
    passwordHash: string;
    creadoEn?: string;
}

export interface UserFavoritosCines {
    userId: string;
    cineId: string;
    creadoEn?: Date;
}

export interface UserFavoritosPeliculas {
    userId: string;
    peliculaId: number;
    creadoEn?: Date;
}

export type CrearUserDTO = Omit<User, "id" | "creadoEn">;
