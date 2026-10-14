import { useEffect, useState } from "react";
import type { Pelicula, Cine, Funcion } from "../types/types";
import peliculaService from "../services/peliculas";
import cineService from "../services/cines";
import funcionService from "../services/funciones";

export function useDetallePelicula(id?: string) {
  const [pelicula, setPelicula] = useState<Pelicula | null>(null);
  const [funciones, setFunciones] = useState<Funcion[]>([]);
  const [cines, setCines] = useState<Cine[]>([]);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelado = false;

    const cargar = async () => {
      try {
        const [peliculaData, funcionesData, cinesData] = await Promise.all([
          peliculaService.getById(id),
          funcionService.getByPelicula(id),
          cineService.getAll(),
        ]);

        if (cancelado) return;
        setErrorCarga(null);
        setPelicula(peliculaData);
        setFunciones(funcionesData);
        setCines(cinesData);
      } catch {
        if (!cancelado) setErrorCarga("No se pudo cargar la información.");
      }
    };

    cargar();

    return () => {
      cancelado = true;
    };
  }, [id]);

  const error = id ? errorCarga : "Pelicula no encontrada.";

  return { pelicula, funciones, cines, error };
}
