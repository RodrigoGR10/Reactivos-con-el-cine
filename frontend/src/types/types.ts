export interface Pelicula {
    id: string;
    titulo: string;
    duracion: number;
    genero: string;
    clasificacion: string;
    poster: string;
}

export interface Cine {
    id: string;
    nombre: string;
    comuna: string;
}

export interface Funcion {
    id: string;
    peliculaId: string;
    cineId: string;
    horario: string;
    formato: string;
    idioma: string;
    precio: number;
}