export interface Butacas {
    disponibles: number;
    total?: number;
    consultadasEn: string;
}

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
