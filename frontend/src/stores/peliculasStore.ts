import { create } from "zustand";
import type { Pelicula } from "../types/types";
import peliculaService from "../services/peliculas";

interface PeliculasState {
  peliculas: Pelicula[];
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;
  cargarPeliculas: (forzar?: boolean) => Promise<void>;
  actualizarPelicula: (pelicula: Pelicula) => void;
}

let request: Promise<void> | null = null;
let controller: AbortController | null = null;
let requestVersion = 0;

export const usePeliculasStore = create<PeliculasState>()((set, get) => ({
  peliculas: [],
  isLoading: true,
  isLoaded: false,
  error: null,

  cargarPeliculas: async (forzar = false) => {
    if (request && !forzar) return request;
    if (get().isLoaded && !forzar) return;

    controller?.abort();
    const currentController = new AbortController();
    controller = currentController;
    const currentVersion = ++requestVersion;

    set({ isLoading: true, error: null });

    const currentRequest = (async () => {
      try {
        const peliculas = await peliculaService.getCartelera(
          currentController.signal,
        );
        if (
          currentController.signal.aborted ||
          currentVersion !== requestVersion
        ) return;

        set({ peliculas, isLoaded: true, error: null });
      } catch {
        if (
          currentController.signal.aborted ||
          currentVersion !== requestVersion
        ) return;

        set({ error: "No se pudieron cargar las películas." });
      } finally {
        if (currentVersion === requestVersion) {
          set({ isLoading: false });
          controller = null;
          request = null;
        }
      }
    })();

    request = currentRequest;
    return currentRequest;
  },

  actualizarPelicula: (peliculaActualizada) =>
    set((state) => ({
      peliculas: state.peliculas.map((pelicula) =>
        pelicula.id === peliculaActualizada.id
          ? { ...pelicula, ...peliculaActualizada }
          : pelicula,
      ),
    })),
}));
