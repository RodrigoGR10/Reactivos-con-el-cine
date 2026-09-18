import { createContext, useContext, useState, type ReactNode } from 'react';
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
    const currentUserId = user ? user.id : null;

    // Detectamos si cambió el usuario conectado para sincronizar favoritos sin cascada de efectos
    const [prevUserId, setPrevUserId] = useState<number | null>(currentUserId);
    const [favoriteMovieIds, setFavoriteMovieIds] = useState<number[]>(() =>
        user ? profileService.getFavoriteMovieIds(user.id) : []
    );
    const [favoriteCinemaIds, setFavoriteCinemaIds] = useState<number[]>(() =>
        user ? profileService.getFavoriteCinemaIds(user.id) : []
    );

    if (currentUserId !== prevUserId) {
        setPrevUserId(currentUserId);
        setFavoriteMovieIds(user ? profileService.getFavoriteMovieIds(user.id) : []);
        setFavoriteCinemaIds(user ? profileService.getFavoriteCinemaIds(user.id) : []);
    }

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

// Hook de acceso al contexto de favoritos
// eslint-disable-next-line react-refresh/only-export-components
export const useFavorites = (): FavoritesContextType => {
    const context = useContext(FavoritesContext);
    if (!context) {
        throw new Error('useFavorites debe ser utilizado dentro de un FavoritesProvider');
    }
    return context;
};
