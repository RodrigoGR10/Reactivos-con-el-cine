interface StorageConfig {
    prefix: string;
    interactedKey: string;
    defaults: number[];
}

const MOVIES_CONFIG: StorageConfig = {
    prefix: 'cine_favoritos_usuario_',
    interactedKey: 'cine_interactuado_',
    defaults: [1, 2, 3, 4, 5],
};

const CINEMAS_CONFIG: StorageConfig = {
    prefix: 'cine_cines_usuario_',
    interactedKey: 'cine_interactuado_cines_',
    defaults: [1, 2, 3],
};

/** Función pura de lectura: no muta localStorage (cumple CQS) */
const getFavoriteIds = (config: StorageConfig, userId: number): number[] => {
    const data = localStorage.getItem(`${config.prefix}${userId}`);
    if (data === null) {
        return config.defaults;
    }
    try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
            const hasInteracted = localStorage.getItem(`${config.interactedKey}${userId}`);
            if (parsed.length === 0 && !hasInteracted) {
                return config.defaults;
            }
            return parsed as number[];
        }
        return config.defaults;
    } catch {
        return config.defaults;
    }
};

/** Función de comando: actualiza favoritos y marca interacción */
const toggleFavoriteId = (config: StorageConfig, userId: number, id: number): number[] => {
    localStorage.setItem(`${config.interactedKey}${userId}`, 'true');
    const current = getFavoriteIds(config, userId);
    const exists = current.includes(id);

    const updated = exists
        ? current.filter((item) => item !== id)
        : [...current, id];

    localStorage.setItem(`${config.prefix}${userId}`, JSON.stringify(updated));
    return updated;
};

const getFavoriteMovieIds = (userId: number): number[] => getFavoriteIds(MOVIES_CONFIG, userId);
const toggleFavoriteMovie = (userId: number, movieId: number): number[] => toggleFavoriteId(MOVIES_CONFIG, userId, movieId);
const isFavoriteMovie = (userId: number, movieId: number): boolean => getFavoriteMovieIds(userId).includes(movieId);

const getFavoriteCinemaIds = (userId: number): number[] => getFavoriteIds(CINEMAS_CONFIG, userId);
const toggleFavoriteCinema = (userId: number, cinemaId: number): number[] => toggleFavoriteId(CINEMAS_CONFIG, userId, cinemaId);
const isFavoriteCinema = (userId: number, cinemaId: number): boolean => getFavoriteCinemaIds(userId).includes(cinemaId);

export default {
    getFavoriteMovieIds,
    toggleFavoriteMovie,
    isFavoriteMovie,
    getFavoriteCinemaIds,
    toggleFavoriteCinema,
    isFavoriteCinema,
};
