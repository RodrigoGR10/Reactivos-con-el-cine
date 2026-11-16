import { pool } from "../../db.ts";

export type DbClient = Awaited<ReturnType<typeof pool.connect>>;

export interface PeliculaRow {
    id: number;
    titulo: string;
    duracion: number | null;
    tmdb_id: number | null;
    tiene_cinemark: boolean;
}

export interface GrupoDuplicado {
    canonica: PeliculaRow;
    duplicadas: PeliculaRow[];
}
