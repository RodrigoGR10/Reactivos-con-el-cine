import type { Pelicula, Horario } from "../types/types";

export interface GrupoHorariosPorPelicula {
  pelicula: Pelicula;
  horarios: Horario[];
}

export function agruparHorariosPorPelicula(
  horarios: Horario[],
  peliculas: Pelicula[],
): GrupoHorariosPorPelicula[] {
  return horarios.reduce<GrupoHorariosPorPelicula[]>((grupos, horario) => {
    const pelicula = peliculas.find((p) => p.id === horario.peliculaId);

    if (!pelicula) {
      return grupos;
    }

    const grupoExistente = grupos.find(
      (grupo) => grupo.pelicula.id === pelicula.id,
    );

    if (grupoExistente) {
      grupoExistente.horarios.push(horario);
      return grupos;
    }

    return [...grupos, { pelicula, horarios: [horario] }];
  }, []);
}
