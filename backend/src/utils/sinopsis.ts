/**
 * Limpia una sinopsis y convierte valores vacíos en un texto seguro.
 * @param value Valor que se valida o normaliza.
 * @returns Texto normalizado o generado por la operación.
 */
export function normalizarSinopsis(value: string | null | undefined): string {
    const sinopsis = value?.trim();
    return !sinopsis ||
        /^(?:sinopsis no publicada|no hay sinopsis disponible)(?: por .+)?[.!]?$/i.test(
            sinopsis,
        )
        ? "No hay sinopsis disponible."
        : sinopsis;
}
