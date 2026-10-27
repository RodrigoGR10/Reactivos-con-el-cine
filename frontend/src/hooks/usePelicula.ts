import { useEffect, useRef, useState } from "react";
import type { Pelicula } from "../types/types";
import peliculaService from "../services/peliculas";
import { useFavorites } from "../context/FavoritesContext";
import { seleccionarDestacadas } from "../utils/seleccionarDestacadas";

const ACTUALIZACION_MS = 30_000;

export function usePeliculas() {
  const { favoriteMovieIds } = useFavorites();
  const hayDatos = useRef(false);
  const [peliculas, setPeliculas] = useState<Pelicula[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    let consultando = false;
    const controller = new AbortController();

    const cargar = async () => {
      if (consultando) return;
      consultando = true;
      try {
        const data = await peliculaService.getCartelera(controller.signal);

        if (!cancelado) {
          const disponibles = data.filter((pelicula) => pelicula.estadoEstreno !== "proximamente");
          setPeliculas(disponibles);
          hayDatos.current = true;
          setError(null);
        }
      } catch {
        if (!cancelado && !hayDatos.current) setError("No se pudieron cargar las películas.");
      } finally {
        consultando = false;
        if (!cancelado) setCargando(false);
      }
    };

    cargar();
    const actualizarVisible = () => { if (document.visibilityState === "visible") void cargar(); };
    const intervalo = window.setInterval(actualizarVisible, ACTUALIZACION_MS);
    document.addEventListener("visibilitychange", actualizarVisible);

    return () => {
      cancelado = true;
      controller.abort();
      window.clearInterval(intervalo);
      document.removeEventListener("visibilitychange", actualizarVisible);
    };
  }, [favoriteMovieIds]);

  return { peliculas, peliculasDestacadas: seleccionarDestacadas(peliculas), cargando, error };
}
