export interface ResolucionManual {
    peliculaId: number;
    tmdbId: number | null;
    motivo: string;
}

export const resolucionesManuales: ResolucionManual[] = [
    // Ejemplos:
    // {
    //     peliculaId: 23,
    //     tmdbId: 123456,
    //     motivo: "Coincidencia verificada manualmente en TMDB",
    // },
    // {
    //     peliculaId: 47,
    //     tmdbId: null,
    //     motivo: "No corresponde a una película del catálogo TMDB",
    // },
];
