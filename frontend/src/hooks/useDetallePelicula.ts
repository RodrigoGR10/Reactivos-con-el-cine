import { useEffect, useState } from "react";
import type { Pelicula, Cine, Horario } from "../types/types";
import peliculaService from "../services/peliculas";
import cineService from "../services/cines";
import funcionService from "../services/funciones";

export function useDetallePelicula(id?: string) {
  const [pelicula, setPelicula] = useState<Pelicula | null>(null);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [idCargado, setIdCargado] = useState<string>();
  const [cines, setCines] = useState<Cine[]>([]);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelado = false;

    const cargar = async () => {
      try {
        const [peliculaData, horariosData, cinesData] = await Promise.all([
          peliculaService.getById(id),
          funcionService.getHorarios(id),
          cineService.getAll(),
        ]);

        if (cancelado) return;
        setErrorCarga(null);
        setPelicula(peliculaData);
        setHorarios(horariosData);
        setIdCargado(id);
        setCines(cinesData);
      } catch {
        if (!cancelado) {
          setErrorCarga("No se pudo cargar la información.");
          setIdCargado(id);
        }
      }
    };

    cargar();

    return () => {
      cancelado = true;
    };
  }, [id]);

  const error = id ? (idCargado === id ? errorCarga : null) : "Pelicula no encontrada.";

  return {
    pelicula: idCargado === id ? pelicula : null,
    horarios: idCargado === id ? horarios : [],
    cines: idCargado === id ? cines : [], error,
  };
}
