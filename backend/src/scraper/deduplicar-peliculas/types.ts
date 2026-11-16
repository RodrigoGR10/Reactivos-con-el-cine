import type { PoolClient } from "pg";

export type DbClient = PoolClient;

export interface PeliculaRow {
    id: number;
    titulo: string;
    titulo_original: string | null;
    duracion: number | null;
    tmdb_id: number | null;
    tiene_cinemark: boolean;
}

export interface GrupoDuplicado {
    canonica: PeliculaRow;
    duplicadas: PeliculaRow[];
}
