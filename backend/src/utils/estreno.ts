export const ESTADOS_ESTRENO = [
    "cartelera",
    "preventa",
    "proximamente",
] as const;
/**
 * Estados posibles de estreno de una película dentro de la cartelera.
 */
export type EstadoEstreno = (typeof ESTADOS_ESTRENO)[number];

/**
 * Estado y fechas que determinan si una película está en preventa, cartelera o reestreno.
 */
export interface DatosEstreno {
    estadoEstreno?: EstadoEstreno;
    fechaEstreno?: string;
}

/**
 * Determina el estado de estreno a partir de las fechas y datos disponibles.
 * @param fuentes Fuentes de estreno asociadas a la película.
 * @param hoy Fecha local de referencia para clasificar el estado de estreno.
 */
export function clasificarEstreno(
    fuentes: (DatosEstreno | { toObject?: () => DatosEstreno })[],
    hoy: string,
): DatosEstreno {
    const plainFuentes = fuentes.map((fuente) =>
        fuente &&
        typeof (fuente as { toObject?: () => DatosEstreno }).toObject ===
            "function"
            ? (fuente as { toObject: () => DatosEstreno }).toObject()
            : (fuente as DatosEstreno),
    );
    const conocidas = plainFuentes.filter(
        (fuente) => fuente.estadoEstreno || fuente.fechaEstreno,
    );
    const estados = conocidas.map((fuente) => ({
        ...fuente,
        estadoEstreno:
            fuente.estadoEstreno === "proximamente"
                ? "proximamente"
                : fuente.fechaEstreno
                  ? fuente.fechaEstreno > hoy
                      ? "preventa"
                      : "cartelera"
                  : fuente.estadoEstreno,
    }));
    // Una pelicula estrenada en alguna cadena se muestra una sola vez en cartelera.
    const estadoEstreno: EstadoEstreno = estados.some(
        (fuente) => fuente.estadoEstreno === "cartelera",
    )
        ? "cartelera"
        : estados.some((fuente) => fuente.estadoEstreno === "preventa")
          ? "preventa"
          : conocidas.length
            ? "proximamente"
            : "cartelera";
    const fechaEstreno = estados
        .filter(
            (fuente) =>
                fuente.estadoEstreno === estadoEstreno && fuente.fechaEstreno,
        )
        .map((fuente) => fuente.fechaEstreno!)
        .sort()[0];
    return { estadoEstreno, ...(fechaEstreno ? { fechaEstreno } : {}) };
}
