import type { Pelicula, Horario } from "../types/types";
import type { OpcionFiltro } from "../components/common/SelectorMultiple";

export interface GrupoHorariosPorPelicula {
  pelicula: Pelicula;
  horarios: Horario[];
}

/**
 * Extrae los formatos únicos disponibles en una lista de horarios junto con su conteo.
 */
export function obtenerFormatosDisponibles(
  horarios: readonly Horario[],
): OpcionFiltro[] {
  const conteo = new Map<string, number>();
  for (const horario of horarios) {
    const formato = horario.formatoResumen || "2D";
    conteo.set(formato, (conteo.get(formato) ?? 0) + 1);
  }
  return [...conteo.entries()].map(([valor, cantidad]) => ({
    valor,
    nombre: valor,
    cantidad,
  }));
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
