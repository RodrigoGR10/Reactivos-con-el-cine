import { query } from "../db.ts";

export async function incluirPopularidad<T extends { id: string }>(
    peliculas: readonly T[],
): Promise<Array<T & { totalFavoritos: number }>> {
    if (!peliculas.length) return [];

    const ids = [
        ...new Set(
            peliculas
                .map((pelicula) => Number(pelicula.id))
                .filter((id) => Number.isSafeInteger(id) && id > 0),
        ),
    ];

    if (!ids.length) {
        return peliculas.map((pelicula) => ({ ...pelicula, totalFavoritos: 0 }));
    }

    const { rows } = await query<{ pelicula_id: number; total: number }>(
        `
        SELECT pelicula_id, COUNT(DISTINCT user_id)::int AS total
        FROM favoritos_peliculas
        WHERE pelicula_id = ANY($1::int[])
        GROUP BY pelicula_id;
        `,
        [ids],
    );

    const totales = new Map(rows.map((row) => [String(row.pelicula_id), row.total]));
    return peliculas.map((pelicula) => ({
        ...pelicula,
        totalFavoritos: totales.get(String(pelicula.id)) ?? 0,
    }));
}
