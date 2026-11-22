import { useMediaQuery } from "@mantine/hooks";

const ES_MOVIL_FILTROS_MEDIA =
    "(max-width: 600px), (max-width: 960px) and (max-height: 500px)";

/**
 * Indica si los filtros deben mostrarse en el panel compacto para pantallas pequeñas.
 * @returns `true` cuando coincide el media query móvil configurado.
 */
export function useEsMovilFiltros() {
    return useMediaQuery(ES_MOVIL_FILTROS_MEDIA) ?? false;
}
