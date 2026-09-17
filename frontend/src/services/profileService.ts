// Prefijos para las claves de almacenamiento por usuario en localStorage
const PREFIX_PELICULAS = 'cine_favoritos_usuario_';
const PREFIX_CINES = 'cine_cines_usuario_';

// Por defecto, hasta integrar las otras vistas, guardamos las 5 películas y los cines base
const DEFAULT_MOVIE_IDS = [1, 2, 3, 4, 5];
const DEFAULT_CINEMA_IDS = [1, 2, 3];

// Obtiene la lista de IDs de películas favoritas de un usuario
const getFavoriteMovieIds = (userId: number): number[] => {
    const data = localStorage.getItem(`${PREFIX_PELICULAS}${userId}`);
    if (data === null) {
        localStorage.setItem(`${PREFIX_PELICULAS}${userId}`, JSON.stringify(DEFAULT_MOVIE_IDS));
        return DEFAULT_MOVIE_IDS;
    }
    try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
            const hasInteracted = localStorage.getItem(`cine_interactuado_${userId}`);
            if (parsed.length === 0 && !hasInteracted) {
                localStorage.setItem(`${PREFIX_PELICULAS}${userId}`, JSON.stringify(DEFAULT_MOVIE_IDS));
                return DEFAULT_MOVIE_IDS;
            }
            return parsed as number[];
        }
        return DEFAULT_MOVIE_IDS;
    } catch {
        return DEFAULT_MOVIE_IDS;
    }
};

// Agrega o quita una película de favoritos (toggle) y retorna la lista actualizada
const toggleFavoriteMovie = (userId: number, movieId: number): number[] => {
    localStorage.setItem(`cine_interactuado_${userId}`, 'true');
    const favorites = getFavoriteMovieIds(userId);
    const exists = favorites.includes(movieId);
    
    const updated = exists
        ? favorites.filter((id) => id !== movieId)
        : [...favorites, movieId];

    localStorage.setItem(`${PREFIX_PELICULAS}${userId}`, JSON.stringify(updated));
    return updated;
};

// Comprueba si una película específica está en los favoritos del usuario
const isFavoriteMovie = (userId: number, movieId: number): boolean => {
    return getFavoriteMovieIds(userId).includes(movieId);
};

// Obtiene la lista de IDs de cines habituales de un usuario
const getFavoriteCinemaIds = (userId: number): number[] => {
    const data = localStorage.getItem(`${PREFIX_CINES}${userId}`);
    if (data === null) {
        localStorage.setItem(`${PREFIX_CINES}${userId}`, JSON.stringify(DEFAULT_CINEMA_IDS));
        return DEFAULT_CINEMA_IDS;
    }
    try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
            const hasInteracted = localStorage.getItem(`cine_interactuado_cines_${userId}`);
            if (parsed.length === 0 && !hasInteracted) {
                localStorage.setItem(`${PREFIX_CINES}${userId}`, JSON.stringify(DEFAULT_CINEMA_IDS));
                return DEFAULT_CINEMA_IDS;
            }
            return parsed as number[];
        }
        return DEFAULT_CINEMA_IDS;
    } catch {
        return DEFAULT_CINEMA_IDS;
    }
};

// Agrega o quita un cine de favoritos y retorna la lista actualizada
const toggleFavoriteCinema = (userId: number, cinemaId: number): number[] => {
    localStorage.setItem(`cine_interactuado_cines_${userId}`, 'true');
    const cinemas = getFavoriteCinemaIds(userId);
    const exists = cinemas.includes(cinemaId);

    const updated = exists
        ? cinemas.filter((id) => id !== cinemaId)
        : [...cinemas, cinemaId];

    localStorage.setItem(`${PREFIX_CINES}${userId}`, JSON.stringify(updated));
    return updated;
};

// Comprueba si un cine específico está marcado como habitual
const isFavoriteCinema = (userId: number, cinemaId: number): boolean => {
    return getFavoriteCinemaIds(userId).includes(cinemaId);
};

export default {
    getFavoriteMovieIds,
    toggleFavoriteMovie,
    isFavoriteMovie,
    getFavoriteCinemaIds,
    toggleFavoriteCinema,
    isFavoriteCinema
};
