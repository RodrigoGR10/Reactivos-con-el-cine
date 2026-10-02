const MOVIES_PREFIX = "cine_favoritos_usuario_";
const CINEMAS_PREFIX = "cine_cines_usuario_";

/** Función pura de lectura: no muta localStorage (cumple CQS) */
const getFavoriteIds = (prefix: string, userId: string): string[] => {
  const data = localStorage.getItem(`${prefix}${userId}`);
  if (data === null) {
    return [];
  }
  try {
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
};

/** Función de comando: actualiza favoritos en localStorage */
const toggleFavoriteId = (
  prefix: string,
  userId: string,
  id: string,
): string[] => {
  const current = getFavoriteIds(prefix, userId);
  const exists = current.includes(id);

  const updated = exists
    ? current.filter((item) => item !== id)
    : [...current, id];

  localStorage.setItem(`${prefix}${userId}`, JSON.stringify(updated));
  return updated;
};

const getFavoriteMovieIds = (userId: string): string[] =>
  getFavoriteIds(MOVIES_PREFIX, userId);
const toggleFavoriteMovie = (userId: string, movieId: string): string[] =>
  toggleFavoriteId(MOVIES_PREFIX, userId, movieId);
const isFavoriteMovie = (userId: string, movieId: string): boolean =>
  getFavoriteMovieIds(userId).includes(movieId);

const getFavoriteCinemaIds = (userId: string): string[] =>
  getFavoriteIds(CINEMAS_PREFIX, userId);
const toggleFavoriteCinema = (userId: string, cinemaId: string): string[] =>
  toggleFavoriteId(CINEMAS_PREFIX, userId, cinemaId);
const isFavoriteCinema = (userId: string, cinemaId: string): boolean =>
  getFavoriteCinemaIds(userId).includes(cinemaId);

export default {
  getFavoriteMovieIds,
  toggleFavoriteMovie,
  isFavoriteMovie,
  getFavoriteCinemaIds,
  toggleFavoriteCinema,
  isFavoriteCinema,
};
