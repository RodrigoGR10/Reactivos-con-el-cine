import { useMediaQuery } from "@mantine/hooks";

const ES_MOVIL_FILTROS_MEDIA =
    "(max-width: 600px), (max-width: 960px) and (max-height: 500px)";

/**
 * Detecta si la barra de filtros debe compactarse en un Drawer móvil unificado.
 */
export function useEsMovilFiltros() {
    return useMediaQuery(ES_MOVIL_FILTROS_MEDIA) ?? false;
}
