import UserModel from "../models/user.ts";

export async function incluirPopularidad<T extends { id: string }>(
  peliculas: readonly T[],
): Promise<Array<T & { totalFavoritos: number }>> {
  if (!peliculas.length) return [];
  const ids = [...new Set(peliculas.map((pelicula) => pelicula.id))];
  // Una pelicula cuenta una sola vez por usuario, incluso en datos antiguos duplicados.
  // Al migrar, esta consulta equivale a COUNT(DISTINCT usuario_id) por pelicula.
  const conteos = await UserModel.aggregate<{ _id: string; total: number }>([
    { $match: { peliculasFavoritas: { $in: ids } } },
    { $project: { favoritas: { $setIntersection: [{ $ifNull: ["$peliculasFavoritas", []] }, ids] } } },
    { $unwind: "$favoritas" },
    { $group: { _id: "$favoritas", total: { $sum: 1 } } },
  ]);
  const totales = new Map(conteos.map((conteo) => [conteo._id, conteo.total]));
  return peliculas.map((pelicula) => ({ ...pelicula, totalFavoritos: totales.get(pelicula.id) ?? 0 }));
}
