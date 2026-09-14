export interface Pelicula {
    id: number;
    titulo: string;
    duracion: number;
    genero: string;
    clasificacion: string;
    poster: string;
}

export interface Cine {
    id: number;
    nombre: string;
    comuna: string;
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