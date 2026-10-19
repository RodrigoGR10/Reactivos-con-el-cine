export const ESTADOS_ESTRENO = ["cartelera", "preventa", "proximamente"] as const;
export type EstadoEstreno = typeof ESTADOS_ESTRENO[number];

export interface DatosEstreno {
  estadoEstreno?: EstadoEstreno;
  fechaEstreno?: string;
}

export function clasificarEstreno(fuentes: (DatosEstreno | { toObject?: () => DatosEstreno })[], hoy: string): DatosEstreno {
  const plainFuentes = fuentes.map((fuente) =>
    fuente && typeof (fuente as { toObject?: () => DatosEstreno }).toObject === "function"
      ? (fuente as { toObject: () => DatosEstreno }).toObject()
      : (fuente as DatosEstreno)
  );
  const conocidas = plainFuentes.filter((fuente) => fuente.estadoEstreno || fuente.fechaEstreno);
  const estados = conocidas.map((fuente) => ({
    ...fuente,
    estadoEstreno: fuente.estadoEstreno === "proximamente"
      ? "proximamente"
      : fuente.fechaEstreno
        ? fuente.fechaEstreno > hoy ? "preventa" : "cartelera"
        : fuente.estadoEstreno,
  }));
  // Una pelicula estrenada en alguna cadena se muestra una sola vez en cartelera.
  const estadoEstreno: EstadoEstreno = estados.some((fuente) => fuente.estadoEstreno === "cartelera")
    ? "cartelera"
    : estados.some((fuente) => fuente.estadoEstreno === "preventa")
      ? "preventa"
      : conocidas.length ? "proximamente" : "cartelera";
  const fechaEstreno = estados
    .filter((fuente) => fuente.estadoEstreno === estadoEstreno && fuente.fechaEstreno)
    .map((fuente) => fuente.fechaEstreno!)
    .sort()[0];
  return { estadoEstreno, ...(fechaEstreno ? { fechaEstreno } : {}) };
}
