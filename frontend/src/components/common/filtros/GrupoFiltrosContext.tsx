import { createContext, useContext, useEffect, useRef } from "react";
import type { GrupoFiltrosCtx, RegistroFiltroGrupo } from "./types";

export const GrupoFiltrosContext = createContext<GrupoFiltrosCtx | null>(null);

/** Obtiene el contexto del grupo de filtros o `null` si no hay grupo contenedor.
 * @returns Contexto de filtros activo, o `null` fuera de su proveedor.
 */
export function useGrupoFiltros(): GrupoFiltrosCtx | null {
    return useContext(GrupoFiltrosContext);
}

/**
 * Maneja el registro automatico del selector en el drawer de movil
 * y la actualizacion del contador de elementos activos
 */

/** Registra las acciones de confirmar y limpiar un selector dentro del grupo.
 * @param filtroId Identificador del registro relacionado.
 * @param cantidadActiva Cantidad de filtros activos dentro del grupo.
 * @param handlers Acciones para actualizar la búsqueda, selección y filtros.
 * @returns Registro con las acciones para actualizar los filtros del grupo.
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
