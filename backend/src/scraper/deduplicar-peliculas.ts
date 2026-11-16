import { pool } from "../db.ts";

import { detectarGrupos } from "./deduplicar-peliculas/deteccion.ts";
import { fusionarGrupo } from "./deduplicar-peliculas/fusionar-grupo.ts";

import type { PeliculaRow } from "./deduplicar-peliculas/types.ts";

export async function deduplicarCatalogoPeliculas(
    options: { apply?: boolean } = {},
) {
    const apply = options.apply === true;

    const result = await pool.query<PeliculaRow>(`
        SELECT
            p.id,
            p.titulo,
            p.duracion,
            p.tmdb_id,
            EXISTS (
                SELECT 1
                FROM pelicula_fuentes pf
                WHERE pf.pelicula_id = p.id
                  AND LOWER(pf.origen) = 'cinemark'
            ) AS tiene_cinemark
        FROM peliculas p
        ORDER BY p.id;
    `);

    const grupos = detectarGrupos(result.rows);

    console.log("\n===== DIAGNÓSTICO DE DUPLICADOS =====");
    console.log(`Películas revisadas: ${result.rows.length}`);
    console.log(`Grupos detectados: ${grupos.length}`);

    for (const grupo of grupos) {
        console.log(
            `\nCanónica: #${grupo.canonica.id} - ${grupo.canonica.titulo}`,
        );

        for (const duplicada of grupo.duplicadas) {
            console.log(`  Fusionar #${duplicada.id} - ${duplicada.titulo}`);
        }
    }

    if (!apply) {
        console.log("\nDRY-RUN: no se modificó ningún registro.");
        return { grupos, apply: false };
    }

    let fusionados = 0;
    const errores: string[] = [];

    for (const grupo of grupos) {
        try {
            await fusionarGrupo(grupo);
            fusionados += grupo.duplicadas.length;
        } catch (error) {
            const mensaje =
                error instanceof Error ? error.message : String(error);

            errores.push(`Grupo ${grupo.canonica.id}: ${mensaje}`);

            console.error(`No se fusionó el grupo: ${mensaje}`);
        }
    }

    console.log("\n===== RESULTADO =====");
    console.log(`Grupos detectados: ${grupos.length}`);
    console.log(`Películas fusionadas: ${fusionados}`);
    console.log(`Errores: ${errores.length}`);

    return { grupos, apply: true, fusionados, errores };
}
