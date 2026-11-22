import type { PoolClient } from "pg";

/**
 * Conexión de PostgreSQL usada dentro de la transacción de deduplicación.
 */
export type DbClient = PoolClient;

/**
 * Fila de película recuperada desde PostgreSQL para fusionar duplicados.
 */
export interface PeliculaRow {
    id: number;
    titulo: string;
    titulo_original: string | null;
    duracion: number | null;
    tmdb_id: number | null;
    tiene_cinemark: boolean;
}

/**
 * Películas que la detección considera duplicadas y su registro canónico.
 */
export interface GrupoDuplicado {
    canonica: PeliculaRow;
    duplicadas: PeliculaRow[];
}
