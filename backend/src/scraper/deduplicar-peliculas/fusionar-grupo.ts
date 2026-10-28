import { pool } from "../../db.ts";

import { completarMetadatosCanonica } from "./fusionar-metadatos.ts";
import {
    eliminarPeliculasDuplicadas,
    fusionarFavoritos,
    fusionarVistas,
    trasladarFuentes,
    trasladarHorarios,
} from "./fusionar-relaciones.ts";

import type { DbClient, GrupoDuplicado } from "./types.ts";

interface PeliculaBloqueada {
    id: number;
    tmdb_id: number | null;
}

async function bloquearPeliculas(
    client: DbClient,
    grupo: GrupoDuplicado,
): Promise<PeliculaBloqueada[]> {
    const ids = [
        grupo.canonica.id,
        ...grupo.duplicadas.map((pelicula) => pelicula.id),
    ];

    const result = await client.query<PeliculaBloqueada>(
        `
        SELECT id, tmdb_id
        FROM peliculas
        WHERE id = ANY($1::int[])
        FOR UPDATE;
        `,
        [ids],
    );

    if (result.rowCount !== ids.length) {
        throw new Error("El grupo cambió mientras se preparaba la fusión.");
    }

    return result.rows;
}

function validarTmdbIds(
    bloqueadas: PeliculaBloqueada[],
    grupo: GrupoDuplicado,
): void {
    const tmdbEsperados = new Map<number, number | null>([
        [grupo.canonica.id, grupo.canonica.tmdb_id],
        ...grupo.duplicadas.map(
            (pelicula) => [pelicula.id, pelicula.tmdb_id] as const,
        ),
    ]);

    for (const pelicula of bloqueadas) {
        const esperado = tmdbEsperados.get(pelicula.id);

        if (pelicula.tmdb_id !== esperado) {
            throw new Error(
                `El TMDB ID de la película #${pelicula.id} cambió ` +
                    `desde el diagnóstico. Esperado: ${esperado}, ` +
                    `actual: ${pelicula.tmdb_id}.`,
            );
        }
    }

    const tmdbIds = new Set(
        bloqueadas
            .map((pelicula) => pelicula.tmdb_id)
            .filter((id): id is number => id !== null),
    );

    if (tmdbIds.size > 1) {
        const ids = grupo.duplicadas.map((pelicula) => pelicula.id);

        throw new Error(`Conflicto de TMDB IDs en grupo ${ids.join(", ")}`);
    }
}

async function ejecutarFusion(
    client: DbClient,
    grupo: GrupoDuplicado,
): Promise<void> {
    const canonicaId = grupo.canonica.id;
    const idsDuplicados = grupo.duplicadas.map((pelicula) => pelicula.id);

    await completarMetadatosCanonica(client, canonicaId, idsDuplicados);

    await trasladarHorarios(client, canonicaId, idsDuplicados);
    await trasladarFuentes(client, canonicaId, idsDuplicados);

    await fusionarFavoritos(client, canonicaId, idsDuplicados);
    await fusionarVistas(client, canonicaId, idsDuplicados);

    await eliminarPeliculasDuplicadas(client, idsDuplicados);
}

export async function fusionarGrupo(grupo: GrupoDuplicado): Promise<void> {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const bloqueadas = await bloquearPeliculas(client, grupo);

        validarTmdbIds(bloqueadas, grupo);

        await ejecutarFusion(client, grupo);

        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}
