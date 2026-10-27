import {
  createContext,
  useCallback,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import profileService from "../services/profileService";

interface FavoritesContextType {
  favoriteMovieIds: string[];
  favoriteCinemaIds: string[];
  toggleFavoriteMovie: (movieId: string) => Promise<boolean>;
  toggleFavoriteCinema: (cinemaId: string) => void;
  isFavoriteMovie: (movieId: string) => boolean;
  isFavoriteCinema: (cinemaId: string) => boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(
  undefined,
);

export const FavoritesProvider = ({ children }: { children: ReactNode }) => {
  const { user, invalidateSession } = useAuth();
  const navigate = useNavigate();
  const [prevUserId, setPrevUserId] = useState<string | undefined>(user?.id);

  const [favoriteMovieIds, setFavoriteMovieIds] = useState<string[]>(
    () => user?.peliculasFavoritas ?? [],
  );
  const [favoriteCinemaIds, setFavoriteCinemaIds] = useState<string[]>(
    () => user?.cinesFavoritos ?? [],
  );

  const handleUnauthorized = useCallback(
    (error: unknown): boolean => {
      if (!axios.isAxiosError<unknown>(error) || error.response?.status !== 401) {
        return false;
      }

      invalidateSession();
      navigate("/login", { replace: true });
      return true;
    },
    [invalidateSession, navigate],
  );

  // Ajusta el estado inmediatamente cuando cambia el usuario activo (login/logout)
  if (user?.id !== prevUserId) {
    setPrevUserId(user?.id);
    setFavoriteMovieIds(user?.peliculasFavoritas ?? []);
    setFavoriteCinemaIds(user?.cinesFavoritos ?? []);
  }

  // Sincroniza favoritos desde el backend cuando hay sesión activa
  useEffect(() => {
    if (!user) return;

    const controller = new AbortController();
    profileService
      .getFavorites(controller.signal)
      .then((favoritos) => {
        if (!controller.signal.aborted) {
          setFavoriteMovieIds(favoritos.peliculasFavoritas);
          setFavoriteCinemaIds(favoritos.cinesFavoritos);
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) handleUnauthorized(error);
      });

    return () => controller.abort();
  }, [user, handleUnauthorized]);

  const toggleFavoriteMovie = async (movieId: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const updated = await profileService.toggleFavoriteMovie(movieId);
      setFavoriteMovieIds(updated);
      return true;
    } catch (error: unknown) {
      if (!handleUnauthorized(error)) console.error("Error al actualizar película favorita:", error);
      return false;
    }
  };

  const toggleFavoriteCinema = (cinemaId: string) => {
    if (!user) return;
    profileService
      .toggleFavoriteCinema(cinemaId)
      .then((updated) => {
        setFavoriteCinemaIds(updated);
      })
      .catch((error: unknown) => {
        if (handleUnauthorized(error)) return;
        console.error("Error al actualizar cine favorito:", error);
      });
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
