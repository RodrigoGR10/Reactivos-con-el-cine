// Transforma una lista plana de funciones en una lista agrupada por cine
import type { Cine, Funcion } from "../types/types";

export interface GrupoFunciones {
    cine: Cine;
    funciones: Funcion[];
}

export function agruparFuncionesPorCine(
    funciones: Funcion[],
    cines: Cine[]
): GrupoFunciones[] {
    return funciones.reduce<GrupoFunciones[]>((grupos, funcion) => {
        const cine = cines.find((c) => c.id === funcion.cineId);
        if (!cine) return grupos;

        const grupoExistente = grupos.find((grupo) => grupo.cine.id === cine.id);
        if (grupoExistente) {
            grupoExistente.funciones.push(funcion);
            return grupos;
        }

        return [...grupos, { cine, funciones: [funcion] }];
    }, []);
}
