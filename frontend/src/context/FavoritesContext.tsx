import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import profileService from '../services/profileService';

interface FavoritesContextType {
    favoriteMovieIds: number[];
    favoriteCinemaIds: number[];
    toggleFavoriteMovie: (movieId: number) => void;
    toggleFavoriteCinema: (cinemaId: number) => void;
    isFavoriteMovie: (movieId: number) => boolean;
    isFavoriteCinema: (cinemaId: number) => boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const FavoritesProvider = ({ children }: { children: ReactNode }) => {
    const { user } = useAuth();

    // Inicialización perezosa: obtiene favoritos iniciales solo en el primer montaje
    const [favoriteMovieIds, setFavoriteMovieIds] = useState<number[]>(() =>
        user ? profileService.getFavoriteMovieIds(user.id) : []
    );
    const [favoriteCinemaIds, setFavoriteCinemaIds] = useState<number[]>(() =>
        user ? profileService.getFavoriteCinemaIds(user.id) : []
    );

    // Sincroniza el estado de favoritos cada vez que cambia la sesión (login/logout)
    useEffect(() => {
        if (user) {
            setFavoriteMovieIds(profileService.getFavoriteMovieIds(user.id));
            setFavoriteCinemaIds(profileService.getFavoriteCinemaIds(user.id));
        } else {
            setFavoriteMovieIds([]);
            setFavoriteCinemaIds([]);
        }
    }, [user]);

    const toggleFavoriteMovie = (movieId: number) => {
        if (!user) return;
        const updated = profileService.toggleFavoriteMovie(user.id, movieId);
        setFavoriteMovieIds(updated);
    };

    const toggleFavoriteCinema = (cinemaId: number) => {
        if (!user) return;
        const updated = profileService.toggleFavoriteCinema(user.id, cinemaId);
        setFavoriteCinemaIds(updated);
    };

    const isFavoriteMovie = (movieId: number): boolean => {
        return favoriteMovieIds.includes(movieId);
    };

    const isFavoriteCinema = (cinemaId: number): boolean => {
        return favoriteCinemaIds.includes(cinemaId);
    };

    return (
        <FavoritesContext.Provider
            value={{
                favoriteMovieIds,
                favoriteCinemaIds,
                toggleFavoriteMovie,
                toggleFavoriteCinema,
                isFavoriteMovie,
                isFavoriteCinema
            }}
        >
            {children}
        </FavoritesContext.Provider>
    );
};

export const useFavorites = (): FavoritesContextType => {
    const context = useContext(FavoritesContext);
    if (!context) {
        throw new Error('useFavorites debe ser utilizado dentro de un FavoritesProvider');
    }
    return context;
};
