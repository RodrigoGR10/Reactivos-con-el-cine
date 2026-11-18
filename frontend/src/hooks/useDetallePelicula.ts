import { useEffect, useState } from "react";
import type { Cine, Horario, Pelicula } from "../types/types";
import { usePeliculasStore } from "../stores/peliculasStore";
import peliculaService from "../services/peliculas";
import cineService from "../services/cines";
import funcionService from "../services/funciones";

interface DatosDetalle {
  id: string;
  pelicula: Pelicula;
  horarios: Horario[];
  cines: Cine[];
}

export function useDetallePelicula(id?: string) {
  const peliculas = usePeliculasStore((state) => state.peliculas);
  const actualizarPelicula = usePeliculasStore(
    (state) => state.actualizarPelicula,
  );
  const peliculaEnCartelera = peliculas.find((pelicula) => pelicula.id === id);
  const [datosDetalle, setDatosDetalle] = useState<DatosDetalle | null>(null);
  const [idConError, setIdConError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const controller = new AbortController();
    void Promise.all([
      peliculaService.getById(id, controller.signal),
      funcionService.getHorarios(id, controller.signal),
      cineService.getAll(controller.signal),
    ])
      .then(([pelicula, horarios, cines]) => {
        if (controller.signal.aborted) return;
        actualizarPelicula(pelicula);
        setDatosDetalle({ id, pelicula, horarios, cines });
        setIdConError(null);
      })
      .catch(() => {
        if (!controller.signal.aborted) setIdConError(id);
      });

    return () => controller.abort();
  }, [id, actualizarPelicula]);

  const error = !id
    ? "Película no encontrada."
    : idConError === id
      ? "No se pudo cargar la información."
      : null;
  const datosActuales = datosDetalle?.id === id ? datosDetalle : null;

  return {
    pelicula: datosActuales?.pelicula ?? peliculaEnCartelera ?? null,
    horarios: datosActuales?.horarios ?? [],
    cines: datosActuales?.cines ?? [],
    error,
  };
}
