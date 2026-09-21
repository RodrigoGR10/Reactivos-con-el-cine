const MOVIES_PREFIX = 'cine_favoritos_usuario_';
const CINEMAS_PREFIX = 'cine_cines_usuario_';

/** Función pura de lectura: no muta localStorage (cumple CQS) */
const getFavoriteIds = (prefix: string, userId: number): number[] => {
    const data = localStorage.getItem(`${prefix}${userId}`);
    if (data === null) {
        return [];
    }
    try {
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? (parsed as number[]) : [];
    } catch {
        return [];
    }
};

/** Función de comando: actualiza favoritos en localStorage */
const toggleFavoriteId = (prefix: string, userId: number, id: number): number[] => {
    const current = getFavoriteIds(prefix, userId);
    const exists = current.includes(id);

    const updated = exists
        ? current.filter((item) => item !== id)
        : [...current, id];

    localStorage.setItem(`${prefix}${userId}`, JSON.stringify(updated));
    return updated;
};

const getFavoriteMovieIds = (userId: number): number[] => getFavoriteIds(MOVIES_PREFIX, userId);
const toggleFavoriteMovie = (userId: number, movieId: number): number[] => toggleFavoriteId(MOVIES_PREFIX, userId, movieId);
const isFavoriteMovie = (userId: number, movieId: number): boolean => getFavoriteMovieIds(userId).includes(movieId);

const getFavoriteCinemaIds = (userId: number): number[] => getFavoriteIds(CINEMAS_PREFIX, userId);
const toggleFavoriteCinema = (userId: number, cinemaId: number): number[] => toggleFavoriteId(CINEMAS_PREFIX, userId, cinemaId);
const isFavoriteCinema = (userId: number, cinemaId: number): boolean => getFavoriteCinemaIds(userId).includes(cinemaId);

export default {
    getFavoriteMovieIds,
    toggleFavoriteMovie,
    isFavoriteMovie,
    getFavoriteCinemaIds,
    toggleFavoriteCinema,
    isFavoriteCinema,
};
