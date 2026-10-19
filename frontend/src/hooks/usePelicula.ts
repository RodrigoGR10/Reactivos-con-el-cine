import { useEffect, useState } from "react";
import type { Pelicula } from "../types/types";
import peliculaService from "../services/peliculas";

//Hook que sirve para cargar las peliculas (en pag principal)

export function usePeliculas() {
  const [peliculas, setPeliculas] = useState<Pelicula[]>([]);
  const [peliculaDestacada, setPeliculaDestacada] = useState<Pelicula | null>(
    null,
  );
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    const cargar = async () => {
      try {
        const data = await peliculaService.getCartelera();

        if (!cancelado) {
          const disponibles = data.filter((pelicula) => pelicula.estadoEstreno !== "proximamente");
          setPeliculas(disponibles);

          const soloPeliculas = disponibles.filter(
            (pelicula) => !/concierto|live viewing/i.test(pelicula.genero ?? "")
          );
          const conBanner = soloPeliculas.filter((pelicula) => Boolean(pelicula.banner));
          const candidatas = conBanner.length > 0 ? conBanner : soloPeliculas;
          if (candidatas.length > 0) {
            const indice = Math.floor(Math.random() * candidatas.length);
            setPeliculaDestacada(candidatas[indice]);
          }
        }
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

  return { peliculas, peliculaDestacada, cargando, error };
}
