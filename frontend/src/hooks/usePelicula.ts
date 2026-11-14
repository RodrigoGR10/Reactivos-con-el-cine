import { useEffect, useRef, useState } from "react";
import type { Pelicula } from "../types/types";
import peliculaService from "../services/peliculas";
import { seleccionarDestacadas } from "../utils/seleccionarDestacadas";

const ACTUALIZACION_MS = 30_000;
let peliculasEnMemoria: Pelicula[] = [];

export function usePeliculas() {
  const hayDatos = useRef(peliculasEnMemoria.length > 0);
  const [peliculas, setPeliculas] = useState<Pelicula[]>(() => peliculasEnMemoria);
  const [cargando, setCargando] = useState(() => peliculasEnMemoria.length === 0);
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
          peliculasEnMemoria = disponibles;
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
  }, []);

  return { peliculas, peliculasDestacadas: seleccionarDestacadas(peliculas), cargando, error };
}
