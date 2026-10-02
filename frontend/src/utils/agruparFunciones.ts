import type { Cine, Pelicula, Funcion } from "../types/types";

export interface GrupoFunciones {
  cine: Cine;
  funciones: Funcion[];
}

export interface GrupoFuncionesPorPelicula {
  pelicula: Pelicula;
  funciones: Funcion[];
}

export function agruparFuncionesPorCine(
  funciones: Funcion[],
  cines: Cine[],
): GrupoFunciones[] {
  return funciones.reduce<GrupoFunciones[]>((grupos, funcion) => {
    const cine = cines.find((c) => c.id === funcion.cineId);

    if (!cine) {
      return grupos;
    }

    const grupoExistente = grupos.find((grupo) => grupo.cine.id === cine.id);

    if (grupoExistente) {
      grupoExistente.funciones.push(funcion);
      return grupos;
    }

    return [...grupos, { cine, funciones: [funcion] }];
  }, []);
}

export function agruparFuncionesPorPelicula(
  funciones: Funcion[],
  peliculas: Pelicula[],
): GrupoFuncionesPorPelicula[] {
  return funciones.reduce<GrupoFuncionesPorPelicula[]>((grupos, funcion) => {
    const pelicula = peliculas.find((p) => p.id === funcion.peliculaId);

    if (!pelicula) {
      return grupos;
    }

    const grupoExistente = grupos.find(
      (grupo) => grupo.pelicula.id === pelicula.id,
    );

    if (grupoExistente) {
      grupoExistente.funciones.push(funcion);
      return grupos;
    }

    return [...grupos, { pelicula, funciones: [funcion] }];
  }, []);
}
