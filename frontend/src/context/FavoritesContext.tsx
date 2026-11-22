import {
    createContext,
    useCallback,
    useContext,
    useRef,
    useState,
    useEffect,
    type ReactNode,
} from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import profileService from "../services/profileService";

interface FavoritesContextType {
    favoriteMovieIds: string[];
    favoriteCinemaIds: string[];
    isLoadingFavorites: boolean;
    toggleFavoriteMovie: (movieId: string) => Promise<boolean>;
    toggleFavoriteCinema: (cinemaId: string) => void;
    isFavoriteMovie: (movieId: string) => boolean;
    isFavoriteCinema: (cinemaId: string) => boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(
    undefined,
);

/**
 * Comparte y sincroniza los favoritos de películas y cines con la API.
 * @param children Componentes que podrán consultar o cambiar favoritos.
 * @returns Elemento de interfaz que representa el componente con las propiedades recibidas.
 */
export const FavoritesProvider = ({ children }: { children: ReactNode }) => {
    const { user, invalidateSession } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const locationRef = useRef(location);
    const [prevUserId, setPrevUserId] = useState<string | undefined>(user?.id);

    useEffect(() => {
        locationRef.current = location;
    }, [location]);

    const [favoriteMovieIds, setFavoriteMovieIds] = useState<string[]>(
        () => user?.peliculasFavoritas ?? [],
    );
    const [favoriteCinemaIds, setFavoriteCinemaIds] = useState<string[]>(
        () => user?.cinesFavoritos ?? [],
    );
    const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
    const isLoadingFavorites = Boolean(user && loadedUserId !== user.id);

    const handleUnauthorized = useCallback(
        (error: unknown): boolean => {
            if (
                !axios.isAxiosError<unknown>(error) ||
                error.response?.status !== 401
            ) {
                return false;
            }

            invalidateSession();
            navigate("/login", {
                replace: true,
                state: { from: locationRef.current },
            });
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
        const currentUserId = user.id;
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
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setLoadedUserId(currentUserId);
                }
            });

        return () => controller.abort();
    }, [user, handleUnauthorized]);

    const toggleFavoriteMovie = async (movieId: string): Promise<boolean> => {
        if (!user) return false;
        const previos = favoriteMovieIds;
        const yaEstaba = previos.includes(movieId);
        setFavoriteMovieIds(
            yaEstaba
                ? previos.filter((id) => id !== movieId)
                : [...previos, movieId],
        );
        try {
            const updated = await profileService.toggleFavoriteMovie(movieId);
            setFavoriteMovieIds(updated);
            return true;
        } catch (error: unknown) {
            setFavoriteMovieIds(previos);
            if (!handleUnauthorized(error))
                console.error("Error al actualizar película favorita:", error);
            return false;
        }
    };

    const toggleFavoriteCinema = (cinemaId: string) => {
        if (!user) return;
        const previos = favoriteCinemaIds;
        const yaEstaba = previos.includes(cinemaId);
        setFavoriteCinemaIds(
            yaEstaba
                ? previos.filter((id) => id !== cinemaId)
                : [...previos, cinemaId],
        );
        profileService
            .toggleFavoriteCinema(cinemaId)
            .then((updated) => {
                setFavoriteCinemaIds(updated);
            })
            .catch((error: unknown) => {
                setFavoriteCinemaIds(previos);
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
                isLoadingFavorites,
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

/**
 * Obtiene listas, consultas y acciones de favoritos del contexto.
 * @returns Estado y métodos para películas y cines guardados.
 * @throws Error si se usa fuera de `FavoritesProvider`.
 */
export const useFavorites = (): FavoritesContextType => {
    const context = useContext(FavoritesContext);
    if (!context) {
        throw new Error(
            "useFavorites debe ser utilizado dentro de un FavoritesProvider",
        );
    }
    return context;
};
