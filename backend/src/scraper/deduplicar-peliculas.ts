import { pool } from "../db.ts";

import { claveParaDuplicados } from "../utils/titulos.ts";

interface PeliculaRow {
    id: number;
    titulo: string;
    duracion: number | null;
    tmdb_id: number | null;
    tiene_cinemark: boolean;
}

interface GrupoDuplicado {
    canonica: PeliculaRow;
    duplicadas: PeliculaRow[];
}

function sonDuplicadas(a: PeliculaRow, b: PeliculaRow): boolean {
    // Nunca mezclar ediciones diferentes.
    if (obtenerTipoEdicion(a.titulo) !== obtenerTipoEdicion(b.titulo)) {
        return false;
    }

    // Si ambos tienen TMDB, debe coincidir.
    if (a.tmdb_id !== null && b.tmdb_id !== null) {
        return a.tmdb_id === b.tmdb_id;
    }

    // Si solo uno tiene TMDB, no hay evidencia suficiente
    // para fusionarlos automáticamente.
    if (a.tmdb_id !== null || b.tmdb_id !== null) {
        return false;
    }

    // Sin TMDB: comparar duración y título.
    if (
        a.duracion !== null &&
        b.duracion !== null &&
        Math.abs(a.duracion - b.duracion) > 10
    ) {
        return false;
    }

    const tituloA = claveParaDuplicados(a.titulo);
    const tituloB = claveParaDuplicados(b.titulo);

    return tituloA.length > 0 && tituloA === tituloB;
}

function elegirCanonica(grupo: PeliculaRow[]): PeliculaRow {
    return (
        grupo.find((p) => p.tiene_cinemark) ??
        [...grupo].sort((a, b) => a.id - b.id)[0]
    );
}

function obtenerTipoEdicion(titulo: string): "original" | "aniversario" {
    return /\b\d+\s*(?:°|º)?\s*ANIVERSARIO\b/i.test(titulo)
        ? "aniversario"
        : "original";
}

function detectarGrupos(peliculas: PeliculaRow[]): GrupoDuplicado[] {
    const visitadas = new Set<number>();
    const grupos: GrupoDuplicado[] = [];

    for (const pelicula of peliculas) {
        if (visitadas.has(pelicula.id)) continue;

        const grupo: PeliculaRow[] = [pelicula];
        visitadas.add(pelicula.id);

        // Agrupación transitiva: una coincidencia con cualquier
        // integrante incorpora la película al mismo grupo.
        let huboCambios = true;

        while (huboCambios) {
            huboCambios = false;

            for (const candidata of peliculas) {
                if (visitadas.has(candidata.id)) continue;

                if (
                    grupo.some((miembro) => sonDuplicadas(miembro, candidata))
                ) {
                    grupo.push(candidata);
                    visitadas.add(candidata.id);
                    huboCambios = true;
                }
            }
        }

        if (grupo.length > 1) {
            const canonica = elegirCanonica(grupo);

            grupos.push({
                canonica,
                duplicadas: grupo.filter((p) => p.id !== canonica.id),
            });
        }
    }

    return grupos;
}

async function fusionarGrupo(grupo: GrupoDuplicado): Promise<void> {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const ids = grupo.duplicadas.map((p) => p.id);
        const canonicaId = grupo.canonica.id;

        // Bloquear las filas involucradas y comprobar que siguen existiendo.
        const bloqueadas = await client.query(
            `SELECT id, tmdb_id FROM peliculas
             WHERE id = ANY($1::int[])
             FOR UPDATE`,
            [[canonicaId, ...ids]],
        );

        if (bloqueadas.rowCount !== ids.length + 1) {
            throw new Error("El grupo cambió mientras se preparaba la fusión.");
        }

        // Verificar que los TMDB IDs no hayan cambiado desde el diagnóstico.
        const tmdbEsperados = new Map<number, number | null>([
            [grupo.canonica.id, grupo.canonica.tmdb_id],
            ...grupo.duplicadas.map(
                (pelicula) => [pelicula.id, pelicula.tmdb_id] as const,
            ),
        ]);

        for (const pelicula of bloqueadas.rows as {
            id: number;
            tmdb_id: number | null;
        }[]) {
            const tmdbEsperado = tmdbEsperados.get(pelicula.id);

            if (pelicula.tmdb_id !== tmdbEsperado) {
                throw new Error(
                    `El TMDB ID de la película #${pelicula.id} cambió ` +
                        `desde el diagnóstico. Esperado: ${tmdbEsperado}, ` +
                        `actual: ${pelicula.tmdb_id}.`,
                );
            }
        }

        // No fusionar si los registros tienen TMDB IDs incompatibles.
        const tmdbIds = new Set(
            bloqueadas.rows
                .map((p: { tmdb_id: number | null }) => p.tmdb_id)
                .filter((id: number | null): id is number => id !== null),
        );

        if (tmdbIds.size > 1) {
            throw new Error(`Conflicto de TMDB IDs en grupo ${ids.join(", ")}`);
        }

        // Completar metadatos de la canónica sin sobrescribir
        // información que ya tenga.
        await client.query(
            `UPDATE peliculas AS principal
             SET
                 tmdb_id = COALESCE(
                     principal.tmdb_id,
                     (
                         SELECT duplicada.tmdb_id
                         FROM peliculas AS duplicada
                         WHERE duplicada.id = ANY($2::int[])
                           AND duplicada.tmdb_id IS NOT NULL
                         ORDER BY duplicada.id
                         LIMIT 1
                     )
                 ),
                 sinopsis = COALESCE(
                     NULLIF(BTRIM(principal.sinopsis), ''),
                     (
                         SELECT NULLIF(BTRIM(duplicada.sinopsis), '')
                         FROM peliculas AS duplicada
                         WHERE duplicada.id = ANY($2::int[])
                           AND NULLIF(BTRIM(duplicada.sinopsis), '') IS NOT NULL
                         ORDER BY duplicada.id
                         LIMIT 1
                     )
                 ),
                 duracion = COALESCE(
                     principal.duracion,
                     (
                         SELECT duplicada.duracion
                         FROM peliculas AS duplicada
                         WHERE duplicada.id = ANY($2::int[])
                           AND duplicada.duracion IS NOT NULL
                         ORDER BY duplicada.id
                         LIMIT 1
                     )
                 ),
                 genero = COALESCE(
                     NULLIF(BTRIM(principal.genero), ''),
                     (
                         SELECT NULLIF(BTRIM(duplicada.genero), '')
                         FROM peliculas AS duplicada
                         WHERE duplicada.id = ANY($2::int[])
                           AND NULLIF(BTRIM(duplicada.genero), '') IS NOT NULL
                         ORDER BY duplicada.id
                         LIMIT 1
                     )
                 ),
                 clasificacion = COALESCE(
                     NULLIF(BTRIM(principal.clasificacion), ''),
                     (
                         SELECT NULLIF(BTRIM(duplicada.clasificacion), '')
                         FROM peliculas AS duplicada
                         WHERE duplicada.id = ANY($2::int[])
                           AND NULLIF(BTRIM(duplicada.clasificacion), '') IS NOT NULL
                         ORDER BY duplicada.id
                         LIMIT 1
                     )
                 ),
                 imagen_url = COALESCE(
                     NULLIF(BTRIM(principal.imagen_url), ''),
                     (
                         SELECT NULLIF(BTRIM(duplicada.imagen_url), '')
                         FROM peliculas AS duplicada
                         WHERE duplicada.id = ANY($2::int[])
                           AND NULLIF(BTRIM(duplicada.imagen_url), '') IS NOT NULL
                         ORDER BY duplicada.id
                         LIMIT 1
                     )
                 ),
                 banner = COALESCE(
                     NULLIF(BTRIM(principal.banner), ''),
                     (
                         SELECT NULLIF(BTRIM(duplicada.banner), '')
                         FROM peliculas AS duplicada
                         WHERE duplicada.id = ANY($2::int[])
                           AND NULLIF(BTRIM(duplicada.banner), '') IS NOT NULL
                         ORDER BY duplicada.id
                         LIMIT 1
                     )
                 )
             WHERE principal.id = $1`,
            [canonicaId, ids],
        );

        // Relaciones que no tienen una clave compuesta conflictiva.
        await client.query(
            `UPDATE horarios
             SET pelicula_id = $1
             WHERE pelicula_id = ANY($2::int[])`,
            [canonicaId, ids],
        );

        await client.query(
            `UPDATE pelicula_fuentes
             SET pelicula_id = $1
             WHERE pelicula_id = ANY($2::int[])`,
            [canonicaId, ids],
        );

        // Favoritos: conservar la fecha más antigua si ya existía
        // el favorito de la película canónica.
        await client.query(
            `INSERT INTO favoritos_peliculas
                (user_id, pelicula_id, agregado_en)
             SELECT user_id, $1, MIN(agregado_en)
             FROM favoritos_peliculas
             WHERE pelicula_id = ANY($2::int[])
             GROUP BY user_id
             ON CONFLICT (user_id, pelicula_id)
             DO UPDATE SET agregado_en = LEAST(
                 favoritos_peliculas.agregado_en,
                 EXCLUDED.agregado_en
             )`,
            [canonicaId, ids],
        );

        await client.query(
            `DELETE FROM favoritos_peliculas
             WHERE pelicula_id = ANY($1::int[])`,
            [ids],
        );

        // Vistas: conservar la fecha más antigua.
        await client.query(
            `INSERT INTO vistas_peliculas
                (user_id, pelicula_id, marcado_en)
             SELECT user_id, $1, MIN(marcado_en)
             FROM vistas_peliculas
             WHERE pelicula_id = ANY($2::int[])
             GROUP BY user_id
             ON CONFLICT (user_id, pelicula_id)
             DO UPDATE SET marcado_en = LEAST(
                 vistas_peliculas.marcado_en,
                 EXCLUDED.marcado_en
             )`,
            [canonicaId, ids],
        );

        await client.query(
            `DELETE FROM vistas_peliculas
             WHERE pelicula_id = ANY($1::int[])`,
            [ids],
        );

        // Eliminar duplicadas solo después de trasladar sus relaciones.
        await client.query(`DELETE FROM peliculas WHERE id = ANY($1::int[])`, [
            ids,
        ]);

        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

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
