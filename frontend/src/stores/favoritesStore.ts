import axios from "axios";
import { create } from "zustand";
import type { Usuario } from "../types/auth";
import profileService from "../services/profileService";
import { useAuthStore } from "./authStore";
import { usePeliculasStore } from "./peliculasStore";

interface FavoritesState {
  favoriteMovieIds: string[];
  favoriteCinemaIds: string[];
  isLoadingFavorites: boolean;
  activeUserId: string | null;
  loadedUserId: string | null;
  loginRedirectVersion: number;
  setUser: (user: Usuario | null) => void;
  loadFavorites: (userId: string, signal?: AbortSignal) => Promise<void>;
  toggleFavoriteMovie: (movieId: string) => Promise<boolean>;
  toggleFavoriteCinema: (cinemaId: string) => Promise<void>;
}

let movieToggleQueue: Promise<void> = Promise.resolve();
let cinemaToggleQueue: Promise<void> = Promise.resolve();
let movieToggleVersion = 0;
let cinemaToggleVersion = 0;
let favoritesRevision = 0;

function handleUnauthorized(error: unknown): boolean {
  if (!axios.isAxiosError(error) || error.response?.status !== 401) return false;

  useAuthStore.getState().invalidateSession();
  useFavoritesStore.setState((state) => ({
    loginRedirectVersion: state.loginRedirectVersion + 1,
  }));
  return true;
}

function reportFavoriteError(message: string, error: unknown): void {
  if (!handleUnauthorized(error)) console.error(message, error);
}

function actualizarLista(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((actual) => actual !== id) : [...ids, id];
}

function mismoUsuario(userId: string): boolean {
  return (
    useFavoritesStore.getState().activeUserId === userId &&
    useAuthStore.getState().user?.id === userId
  );
}

async function reconciliarFavoritos(userId: string): Promise<void> {
  if (!mismoUsuario(userId)) return;
  try {
    const favoritos = await profileService.getFavorites();
    if (!mismoUsuario(userId)) return;
    useFavoritesStore.setState({
      favoriteMovieIds: favoritos.peliculasFavoritas,
      favoriteCinemaIds: favoritos.cinesFavoritos,
      loadedUserId: userId,
      isLoadingFavorites: false,
    });
  } catch (error: unknown) {
    if (mismoUsuario(userId)) {
      useFavoritesStore.setState({ loadedUserId: userId, isLoadingFavorites: false });
    }
    reportFavoriteError("Error al sincronizar favoritos:", error);
  }
}

export const useFavoritesStore = create<FavoritesState>()((set, get) => ({
  favoriteMovieIds: [],
  favoriteCinemaIds: [],
  isLoadingFavorites: false,
  activeUserId: null,
  loadedUserId: null,
  loginRedirectVersion: 0,

  setUser: (user) => {
    const activeUserId = user?.id ?? null;
    if (get().activeUserId === activeUserId) return;
    favoritesRevision += 1;

    set({
      activeUserId,
      favoriteMovieIds: user?.peliculasFavoritas?.map(String) ?? [],
      favoriteCinemaIds: user?.cinesFavoritos?.map(String) ?? [],
      loadedUserId: null,
      isLoadingFavorites: user !== null,
    });
  },

  loadFavorites: async (userId, signal) => {
    const revision = favoritesRevision;
    try {
      const favoritos = await profileService.getFavorites(signal);
      if (
        signal?.aborted ||
        revision !== favoritesRevision ||
        get().activeUserId !== userId
      ) return;
      set({
        favoriteMovieIds: favoritos.peliculasFavoritas,
        favoriteCinemaIds: favoritos.cinesFavoritos,
        loadedUserId: userId,
        isLoadingFavorites: false,
      });
    } catch (error: unknown) {
      if (
        signal?.aborted ||
        revision !== favoritesRevision ||
        get().activeUserId !== userId
      ) return;
      set({ loadedUserId: userId, isLoadingFavorites: false });
      reportFavoriteError("Error al cargar favoritos:", error);
    }
  },

  toggleFavoriteMovie: async (movieId) => {
    const user = useAuthStore.getState().user;
    if (!user) return false;
    if (get().activeUserId !== user.id) get().setUser(user);

    const version = ++movieToggleVersion;
    favoritesRevision += 1;
    set((state) => ({
      favoriteMovieIds: actualizarLista(state.favoriteMovieIds, movieId),
    }));

    const request = movieToggleQueue.then(async () => {
      if (!mismoUsuario(user.id)) return false;
      try {
        const ids = await profileService.toggleFavoriteMovie(movieId);
        if (mismoUsuario(user.id) && version === movieToggleVersion) {
          set({
            favoriteMovieIds: ids,
            loadedUserId: user.id,
            isLoadingFavorites: false,
          });
          void usePeliculasStore.getState().cargarPeliculas(true);
        }
        return true;
      } catch (error: unknown) {
        if (mismoUsuario(user.id) && version === movieToggleVersion) {
          await reconciliarFavoritos(user.id);
        }
        reportFavoriteError("Error al actualizar película favorita:", error);
        return false;
      }
    });
    movieToggleQueue = request.then(() => undefined, () => undefined);
    return request;
  },

  toggleFavoriteCinema: async (cinemaId) => {
    const user = useAuthStore.getState().user;
    if (!user) return;
    if (get().activeUserId !== user.id) get().setUser(user);

    const version = ++cinemaToggleVersion;
    favoritesRevision += 1;
    set((state) => ({
      favoriteCinemaIds: actualizarLista(state.favoriteCinemaIds, cinemaId),
    }));

    const request = cinemaToggleQueue.then(async () => {
      if (!mismoUsuario(user.id)) return;
      try {
        const ids = await profileService.toggleFavoriteCinema(cinemaId);
        if (mismoUsuario(user.id) && version === cinemaToggleVersion) {
          set({
            favoriteCinemaIds: ids,
            loadedUserId: user.id,
            isLoadingFavorites: false,
          });
        }
      } catch (error: unknown) {
        if (mismoUsuario(user.id) && version === cinemaToggleVersion) {
          await reconciliarFavoritos(user.id);
        }
        reportFavoriteError("Error al actualizar cine favorito:", error);
      }
    });
    cinemaToggleQueue = request.then(() => undefined, () => undefined);
    await request;
  },

}));
