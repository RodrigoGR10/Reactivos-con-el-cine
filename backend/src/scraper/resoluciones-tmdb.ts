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
    {
        peliculaId: 4,
        tmdbId: 299534,
        motivo: "Coincidencia verificada manualmente en TMDB",
    },
    {
        peliculaId: 15,
        tmdbId: 920,
        motivo: "Coincidencia verificada manualmente en TMDB",
    },
    {
        peliculaId: 42,
        tmdbId: 1339713,
        motivo: "Coincidencia verificada manualmente en TMDB",
    },
    {
        peliculaId: 43,
        tmdbId: 1515139,
        motivo: "Coincidencia verificada manualmente en TMDB",
    },
    {
        peliculaId: 49,
        tmdbId: 1711650,
        motivo: "Coincidencia verificada manualmente en TMDB",
    },
    {
        peliculaId: 50,
        tmdbId: 1785968,
        motivo: "Coincidencia verificada manualmente en TMDB",
    },
    {
        peliculaId: 52,
        tmdbId: 1797226,
        motivo: "Coincidencia verificada manualmente en TMDB",
    },
    {
        peliculaId: 53,
        tmdbId: null,
        motivo: "No corresponde a una película del catálogo TMDB, la version ENCORE no es la misma que la NEW",
    },
    {
        peliculaId: 62,
        tmdbId: null,
        motivo: "No se sabe a ciencia cierta si la version de aniversario es diferente a la original en TMDB",
    },
];
