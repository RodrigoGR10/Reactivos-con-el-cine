import { query } from "../db.ts";

interface PopularidadRow {
  id: string;
  total: number;
}

export async function incluirPopularidad<T extends { id: string }>(
  peliculas: readonly T[],
): Promise<Array<T & { totalFavoritos: number }>> {
  if (!peliculas.length) return [];
  const ids = [...new Set(peliculas.map((pelicula) => pelicula.id))];
  const idsNumericos = ids.filter((id) => /^\d+$/.test(id)).map(Number);
  const totales = new Map<string, number>();

  if (idsNumericos.length) {
    const { rows } = await query<PopularidadRow>(`
      SELECT pelicula_id::text AS id, COUNT(DISTINCT user_id)::int AS total
      FROM favoritos_peliculas
      WHERE pelicula_id = ANY($1::int[])
      GROUP BY pelicula_id;
    `, [idsNumericos]);
    for (const fila of rows) totales.set(fila.id, fila.total);
  }

  return peliculas.map((pelicula) => ({ ...pelicula, totalFavoritos: totales.get(pelicula.id) ?? 0 }));
}
