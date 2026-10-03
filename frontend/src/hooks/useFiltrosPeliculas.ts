import { useState } from "react";
import type { Pelicula } from "../types/types";

function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es-CL");
}

function cumpleFiltroDuracion(duracion: number, filtro: string): boolean {
  if (filtro === "corta") return duracion <= 100;
  if (filtro === "media") return duracion >= 101 && duracion <= 130;
  if (filtro === "larga") return duracion > 130;
  return true;
}

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
