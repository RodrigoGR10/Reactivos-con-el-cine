import { createContext, useContext, useEffect, useRef } from "react";
import type { GrupoFiltrosCtx, RegistroFiltroGrupo } from "./types";

export const GrupoFiltrosContext = createContext<GrupoFiltrosCtx | null>(null);

export function useGrupoFiltros(): GrupoFiltrosCtx | null {
    return useContext(GrupoFiltrosContext);
}

/**
 * Maneja el registro automatico del selector en el drawer de movil
 * y la actualizacion del contador de elementos activos
 */

export function useRegistroFiltroGrupo(
    filtroId: string,
    cantidadActiva: number,
    handlers: RegistroFiltroGrupo,
) {
    const grupo = useGrupoFiltros();
    const handlersRef = useRef(handlers);

    //Mantiene los handlers frescos sin tener que
    // re-ejecutar el effect
    useEffect(() => {
        handlersRef.current = handlers;
    }, [handlers]);

    useEffect(() => {
        if (!grupo) return;

        grupo.actualizarConteo(filtroId, cantidadActiva);

        return grupo.registrar(filtroId, {
            commit: () => handlersRef.current.commit(),
            clear: () => handlersRef.current.clear(),
        });
    }, [grupo, filtroId, cantidadActiva]);

    return grupo;
}
