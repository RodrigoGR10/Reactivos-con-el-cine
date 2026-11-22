/**
 * Cantidad de butacas disponibles y total informado para una función.
 */
export interface Butacas {
    disponibles: number;
    total?: number;
    consultadasEn: string;
}

/**
 * Convierte la respuesta de disponibilidad de butacas al formato interno.
 * @param disponibles Cantidad de butacas disponibles informada por el proveedor.
 * @param total Cantidad total de butacas de la sala.
 * @param consultadasEn Instante en que se consultó el estado de butacas.
 * @param opciones Señal de cancelación, timeout y callback para procesar cada elemento.
 * @returns Valor convertido al formato requerido por la aplicación.
 */
export function normalizarButacas(
    disponibles: unknown,
    total: unknown,
    consultadasEn: string,
    opciones?: { ajustarTotalAlDisponible?: boolean },
): Butacas | undefined {
    if (
        typeof disponibles !== "number" ||
        !Number.isSafeInteger(disponibles) ||
        disponibles < 0
    )
        return undefined;
    const totalPositivo =
        typeof total === "number" && Number.isSafeInteger(total) && total > 0
            ? total
            : undefined;
    const totalAjustado =
        totalPositivo !== undefined && opciones?.ajustarTotalAlDisponible
            ? Math.max(totalPositivo, disponibles)
            : totalPositivo;
    const capacidadValida =
        totalAjustado !== undefined && totalAjustado >= disponibles;
    return {
        disponibles,
        ...(capacidadValida ? { total: totalAjustado } : {}),
        consultadasEn,
    };
}
