import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useFavorites } from "../context/FavoritesContext";

/**
 * Captura el conjunto de películas y cines favoritos únicamente al montar la vista
 * (o cuando cambia/termina de cargar la sesión del usuario), evitando que las listas
 * o grillas se reordenen en vivo mientras el usuario marca o desmarca favoritos.
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
