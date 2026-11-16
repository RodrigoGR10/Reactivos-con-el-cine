import { useEffect, useMemo, useRef, useState } from "react";
import type { Pelicula } from "../types/types";
import peliculaService from "../services/peliculas";
import { seleccionarDestacadas } from "../utils/seleccionarDestacadas";

let peliculasEnMemoria: Pelicula[] = [];

function mismaPelicula(a: Pelicula, b: Pelicula): boolean {
  return (
    a.id === b.id &&
    a.titulo === b.titulo &&
    a.duracion === b.duracion &&
    a.genero === b.genero &&
    a.clasificacion === b.clasificacion &&
    a.sinopsis === b.sinopsis &&
    a.poster === b.poster &&
    a.banner === b.banner &&
    a.estadoEstreno === b.estadoEstreno &&
    a.fechaEstreno === b.fechaEstreno &&
    a.totalFavoritos === b.totalFavoritos
  );
}

function mismasPeliculas(actuales: Pelicula[], nuevas: Pelicula[]): boolean {
  return (
    actuales.length === nuevas.length &&
    actuales.every((pelicula, indice) => mismaPelicula(pelicula, nuevas[indice]))
  );
}

export function usePeliculas() {
  const hayDatos = useRef(peliculasEnMemoria.length > 0);
  const [peliculas, setPeliculas] = useState<Pelicula[]>(() => peliculasEnMemoria);
  const [cargando, setCargando] = useState(() => peliculasEnMemoria.length === 0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    const controller = new AbortController();

    const cargar = async () => {
      try {
        const data = await peliculaService.getCartelera(controller.signal);

        if (!cancelado) {
          const disponibles = data.filter((pelicula) => pelicula.estadoEstreno !== "proximamente");
          if (!mismasPeliculas(peliculasEnMemoria, disponibles)) {
            peliculasEnMemoria = disponibles;
            setPeliculas(disponibles);
          }
          hayDatos.current = true;
          setError(null);
        }
      } catch {
        if (!cancelado && !hayDatos.current) setError("No se pudieron cargar las películas.");
      } finally {
        if (!cancelado) setCargando(false);
      }
    };

    void cargar();

    return () => {
      cancelado = true;
      controller.abort();
    };
  }, []);

  const peliculasDestacadas = useMemo(() => seleccionarDestacadas(peliculas), [peliculas]);

  return { peliculas, peliculasDestacadas, cargando, error };
}
