import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import profileService from "../services/profileService";

interface FavoritesContextType {
  favoriteMovieIds: string[];
  favoriteCinemaIds: string[];
  toggleFavoriteMovie: (movieId: string) => void;
  toggleFavoriteCinema: (cinemaId: string) => void;
  isFavoriteMovie: (movieId: string) => boolean;
  isFavoriteCinema: (cinemaId: string) => boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(
  undefined,
);

export const FavoritesProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();

  // Inicialización perezosa: obtiene favoritos iniciales solo en el primer montaje
  const [favoriteMovieIds, setFavoriteMovieIds] = useState<string[]>(() =>
    user ? profileService.getFavoriteMovieIds(user.id) : [],
  );
  const [favoriteCinemaIds, setFavoriteCinemaIds] = useState<string[]>(() =>
    user ? profileService.getFavoriteCinemaIds(user.id) : [],
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

  const toggleFavoriteMovie = (movieId: string) => {
    if (!user) return;
    const updated = profileService.toggleFavoriteMovie(user.id, movieId);
    setFavoriteMovieIds(updated);
  };

  const toggleFavoriteCinema = (cinemaId: string) => {
    if (!user) return;
    const updated = profileService.toggleFavoriteCinema(user.id, cinemaId);
    setFavoriteCinemaIds(updated);
  };

  const isFavoriteMovie = (movieId: string): boolean => {
    return favoriteMovieIds.includes(movieId);
  };

  const isFavoriteCinema = (cinemaId: string): boolean => {
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
        isFavoriteCinema,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = (): FavoritesContextType => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error(
      "useFavorites debe ser utilizado dentro de un FavoritesProvider",
    );
  }
  return context;
};
