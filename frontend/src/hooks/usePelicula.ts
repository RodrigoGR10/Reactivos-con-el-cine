import { useEffect, useState } from "react";
import type { Pelicula } from "../types/types";
import peliculaService from "../services/peliculas";

//Hook que sirve para cargar las peliculas (en pag principal)

export function usePeliculas() {
  const [peliculas, setPeliculas] = useState<Pelicula[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    const cargar = async () => {
      try {
        const data = await peliculaService.getAll();

        if (!cancelado) setPeliculas(data);
      } catch {
        if (!cancelado) setError("No se pudieron cargar las películas.");
      } finally {
        setCargando(false);
      }
    };

    cargar();

    return () => {
      cancelado = true;
    };
  }, []);

  return { peliculas, cargando, error };
}
