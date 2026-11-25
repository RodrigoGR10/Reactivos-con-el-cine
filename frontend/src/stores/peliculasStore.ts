
import { create } from "zustand";
import type { Pelicula } from "../types/types";
import peliculaService from "../services/peliculas";

interface PeliculasState {
    peliculas: Pelicula[];
    cargando: boolean;
    isLoaded: boolean;
    error: string | null;

    cargarPeliculas: (forzar?: boolean) => Promise<void>;
}

let request: Promise<void> | null = null;
let controller: AbortController | null = null;
let requestVersion = 0;

export const usePeliculasStore = create<PeliculasState>()(
    (set, get) => ({
        peliculas: [],
        cargando: true,
        isLoaded: false,
        error: null,

        /**
         * Carga la cartelera desde el backend.
         *
         * Evita repetir solicitudes si ya hay una carga en curso
         * o si el catálogo ya fue cargado correctamente.
         *
         * `forzar` permite volver a consultar el backend.
         */
        cargarPeliculas: async (forzar = false) => {
            if (request && !forzar) {
                return request;
            }

            if (get().isLoaded && !forzar) {
                return;
            }

            controller?.abort();

            const currentController = new AbortController();
            const currentVersion = ++requestVersion;

            controller = currentController;

            set({
                cargando: true,
                error: null,
            });

            const currentRequest = (async () => {
                try {
                    const peliculas = await peliculaService.getCartelera(
                        currentController.signal,
                    );

                    if (
                        currentController.signal.aborted ||
                        currentVersion !== requestVersion
                    ) {
                        return;
                    }

                    set({
                        peliculas,
                        isLoaded: true,
                        error: null,
                    });
                } catch {
                    if (
                        currentController.signal.aborted ||
                        currentVersion !== requestVersion
                    ) {
                        return;
                    }

                    set((state) => ({
                        error:
                            state.peliculas.length === 0
                                ? "No se pudieron cargar las películas."
                                : null,
                    }));
                } finally {
                    if (currentVersion === requestVersion) {
                        set({ cargando: false });
                        controller = null;
                        request = null;
                    }
                }
            })();

            request = currentRequest;

            return currentRequest;
        },
    }),
);
