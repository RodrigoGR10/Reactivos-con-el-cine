const ALIAS: Record<string, string> = {
    TE: "TE",
    "TE+7": "TE+7",
    "14": "MA14",
    "+14": "MA14",
    "14+": "MA14",
    MA14: "MA14",
    "18": "MA18",
    "+18": "MA18",
    "18+": "MA18",
    MA18: "MA18",
    TBC: "TBC",
};

/**
 * Unifica el formato de una clasificación por edad.
 * @param valor Texto que se normaliza o valida.
 * @returns Texto normalizado o generado por la operación.
 */
export function normalizarClasificacion(
    valor: string | null | undefined,
): string {
    const clasificacion = valor?.replace(/\s+/g, " ").trim() ?? "";
    const clave = clasificacion.replace(/\s+/g, "").toUpperCase();
    return ALIAS[clave] ?? clasificacion;
}
