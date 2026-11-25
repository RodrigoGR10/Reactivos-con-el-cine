import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useFavorites } from "../context/FavoritesContext";

/**
 * Conserva una copia de los favoritos al entrar para mantener estable el orden
 * de las listas mientras la persona marca o quita elementos.
 * @returns Conjuntos de favoritos capturados para películas y cines.
 */
export function useFavoritosAlEntrar() {
    const { user, isLoadingSession } = useAuth();
    const { favoriteMovieIds, favoriteCinemaIds, isLoadingFavorites } =
        useFavorites();

    const claveSesion =
        isLoadingSession || isLoadingFavorites ? undefined : (user?.id ?? null);
    const [sesionCapturada, setSesionCapturada] = useState<
        string | null | undefined
    >(claveSesion);
    const [peliculasFavoritasAlEntrar, setPeliculasFavoritasAlEntrar] =
        useState<ReadonlySet<string>>(
            () => new Set(user ? favoriteMovieIds : []),
        );
    const [cinesFavoritosAlEntrar, setCinesFavoritosAlEntrar] = useState<
        ReadonlySet<string>
    >(() => new Set(user ? favoriteCinemaIds : []));

    if (claveSesion !== undefined && claveSesion !== sesionCapturada) {
        setSesionCapturada(claveSesion);
        setPeliculasFavoritasAlEntrar(new Set(user ? favoriteMovieIds : []));
        setCinesFavoritosAlEntrar(new Set(user ? favoriteCinemaIds : []));
    }

    return {
        peliculasFavoritasAlEntrar,
        cinesFavoritosAlEntrar,
    };
}
