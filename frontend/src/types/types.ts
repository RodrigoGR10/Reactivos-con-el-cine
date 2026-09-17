export interface Pelicula {
    id: number;
    titulo: string;
    poster: string;
    duracion?: number;
    genero?: string;
    clasificacion?: string;
    sinopsis?: string;
    rating?: string;
}

export interface Cine {
    id: number;
    nombre: string;
    comuna: string;
    logo?: string;
}

export interface Funcion {
    id: number;
    peliculaId: number;
    cineId: number;
    horario: string;
    formato: string;
    idioma: string;
    precio: number;
}