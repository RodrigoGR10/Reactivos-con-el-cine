export interface Butacas {
  disponibles: number;
  total?: number;
  consultadasEn: string;
}

export function normalizarButacas(disponibles: unknown, total: unknown, consultadasEn: string): Butacas | undefined {
  if (typeof disponibles !== "number" || !Number.isSafeInteger(disponibles) || disponibles < 0) return undefined;
  const capacidadValida = typeof total === "number" && Number.isSafeInteger(total) && total > 0 && total >= disponibles;
  return { disponibles, ...(capacidadValida ? { total } : {}), consultadasEn };
}
