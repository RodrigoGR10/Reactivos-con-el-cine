export interface ResolucionManual {
    peliculaId: number;
    tmdbId: number | null;
    motivo: string;
}

// Resoluciones manuales específicas de la instancia local actual de PostgreSQL.
// No subir IDs auto-incrementales locales al repositorio porque cambian entre bases nuevas.
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
