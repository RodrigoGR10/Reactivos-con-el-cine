import type { DbClient } from "./types.ts";

export async function trasladarHorarios(
    client: DbClient,
    canonicaId: number,
    idsDuplicados: number[],
): Promise<void> {
    await client.query(
        `
        UPDATE horarios
        SET pelicula_id = $1
        WHERE pelicula_id = ANY($2::int[]);
        `,
        [canonicaId, idsDuplicados],
    );
}

export async function trasladarFuentes(
    client: DbClient,
    canonicaId: number,
    idsDuplicados: number[],
): Promise<void> {
    await client.query(
        `
        UPDATE pelicula_fuentes
        SET pelicula_id = $1
        WHERE pelicula_id = ANY($2::int[]);
        `,
        [canonicaId, idsDuplicados],
    );
}

export async function fusionarFavoritos(
    client: DbClient,
    canonicaId: number,
    idsDuplicados: number[],
): Promise<void> {
    await client.query(
        `
        INSERT INTO favoritos_peliculas
            (user_id, pelicula_id, agregado_en)
        SELECT user_id, $1, MIN(agregado_en)
        FROM favoritos_peliculas
        WHERE pelicula_id = ANY($2::int[])
        GROUP BY user_id
        ON CONFLICT (user_id, pelicula_id)
        DO UPDATE SET agregado_en = LEAST(
            favoritos_peliculas.agregado_en,
            EXCLUDED.agregado_en
        );
        `,
        [canonicaId, idsDuplicados],
    );

    await client.query(
        `
        DELETE FROM favoritos_peliculas
        WHERE pelicula_id = ANY($1::int[]);
        `,
        [idsDuplicados],
    );
}

export async function fusionarVistas(
    client: DbClient,
    canonicaId: number,
    idsDuplicados: number[],
): Promise<void> {
    await client.query(
        `
        INSERT INTO vistas_peliculas
            (user_id, pelicula_id, marcado_en)
        SELECT user_id, $1, MIN(marcado_en)
        FROM vistas_peliculas
        WHERE pelicula_id = ANY($2::int[])
        GROUP BY user_id
        ON CONFLICT (user_id, pelicula_id)
        DO UPDATE SET marcado_en = LEAST(
            vistas_peliculas.marcado_en,
            EXCLUDED.marcado_en
        );
        `,
        [canonicaId, idsDuplicados],
    );

    await client.query(
        `
        DELETE FROM vistas_peliculas
        WHERE pelicula_id = ANY($1::int[]);
        `,
        [idsDuplicados],
    );
}

export async function eliminarPeliculasDuplicadas(
    client: DbClient,
    idsDuplicados: number[],
): Promise<void> {
    await client.query(
        `
        DELETE FROM peliculas
        WHERE id = ANY($1::int[]);
        `,
        [idsDuplicados],
    );
}
