import { useState } from "react";
import type { Pelicula } from "../types/types";
import { normalizarTexto } from "../utils/normalizarTexto";
import { cumpleFiltroDuracion } from "../utils/cumpleFiltroDuracion";

const ValoresUnicos = (
  peliculas: Pelicula[],
  campo: "genero" | "clasificacion",
) => [...new Set(peliculas.map((pelicula) => pelicula[campo]))].sort();

export interface Filtros {
  busqueda: string;
  genero: string;
  clasificacion: string;
  duracion: string;
}

const FILTROS_INICIALES: Filtros = {
  busqueda: "",
  genero: "",
  clasificacion: "",
  duracion: "",
};

export function useFiltrosPeliculas(peliculas: Pelicula[]) {
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIALES);

  const cambiarFiltro = (campo: keyof Filtros, valor: string) =>
    setFiltros((anterior) => ({ ...anterior, [campo]: valor }));

  const limpiarFiltros = () => setFiltros(FILTROS_INICIALES);

  const terminoBusqueda = normalizarTexto(filtros.busqueda.trim());

  const peliculasFiltradas = peliculas.filter(
    (pelicula) =>
      normalizarTexto(pelicula.titulo).includes(terminoBusqueda) &&
      (filtros.genero === "" || pelicula.genero === filtros.genero) &&
      (filtros.clasificacion === "" ||
        pelicula.clasificacion === filtros.clasificacion) &&
      cumpleFiltroDuracion(pelicula.duracion, filtros.duracion),
  );

  const hayFiltrosActivos = Object.values(filtros).some(
    (valor) => valor.trim() !== "",
  );

  return {
    filtros,
    cambiarFiltro,
    limpiarFiltros,
    hayFiltrosActivos,
    peliculasFiltradas,
    generosDisponibles: ValoresUnicos(peliculas, "genero"),
    clasificacionesDisponibles: ValoresUnicos(peliculas, "clasificacion"),
  };
}
