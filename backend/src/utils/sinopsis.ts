export function normalizarSinopsis(value: string | null | undefined): string {
  const sinopsis = value?.trim();
  return !sinopsis || /^(?:sinopsis no publicada|no hay sinopsis disponible)(?: por .+)?[.!]?$/i.test(sinopsis)
    ? "No hay sinopsis disponible."
    : sinopsis;
}
