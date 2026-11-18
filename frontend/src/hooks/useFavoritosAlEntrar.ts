import { useState } from "react";
import { useAuthStore } from "../stores/authStore";
import { useFavoritesStore } from "../stores/favoritesStore";

/**
 * Captura el conjunto de películas y cines favoritos únicamente al montar la vista
 * (o cuando cambia/termina de cargar la sesión del usuario), evitando que las listas
 * o grillas se reordenen en vivo mientras el usuario marca o desmarca favoritos.
 */
export function useFavoritosAlEntrar() {
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const isLoadingSession = useAuthStore((state) => state.isLoadingSession);
  const favoriteMovieIds = useFavoritesStore((state) => state.favoriteMovieIds);
  const favoriteCinemaIds = useFavoritesStore((state) => state.favoriteCinemaIds);
  const isLoadingFavorites = useFavoritesStore((state) => state.isLoadingFavorites);

  const claveSesion =
    isLoadingSession || isLoadingFavorites ? undefined : userId;
  const [sesionCapturada, setSesionCapturada] = useState<string | null | undefined>(
    claveSesion,
  );
  const [peliculasFavoritasAlEntrar, setPeliculasFavoritasAlEntrar] = useState<
    ReadonlySet<string>
  >(() => new Set(userId ? favoriteMovieIds : []));
  const [cinesFavoritosAlEntrar, setCinesFavoritosAlEntrar] = useState<
    ReadonlySet<string>
  >(() => new Set(userId ? favoriteCinemaIds : []));

  if (claveSesion !== undefined && claveSesion !== sesionCapturada) {
    setSesionCapturada(claveSesion);
    setPeliculasFavoritasAlEntrar(new Set(userId ? favoriteMovieIds : []));
    setCinesFavoritosAlEntrar(new Set(userId ? favoriteCinemaIds : []));
  }

  return {
    peliculasFavoritasAlEntrar,
    cinesFavoritosAlEntrar,
  };
}
