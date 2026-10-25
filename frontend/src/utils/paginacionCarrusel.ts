export function tarjetasPreventaVisibles(anchoDisponible: number, esMovil: boolean) {
  if (esMovil) return 2;
  const anchoMaximo = 180;
  const separacion = 18;
  return Math.max(2, Math.ceil((anchoDisponible + separacion) / (anchoMaximo + separacion)));
}

export function paginacionCarrusel(total: number, visibles: number, solicitada: number) {
  const capacidad = Math.max(1, Math.trunc(visibles));
  const ultimaPagina = Math.max(0, Math.ceil(total / capacidad) - 1);
  const pagina = Math.max(0, Math.min(ultimaPagina, Math.trunc(solicitada)));
  const posicion = Math.min(pagina * capacidad, Math.max(0, total - capacidad));
  return {
    pagina,
    ultimaPagina,
    posicion,
    desde: total > 0 ? posicion + 1 : 0,
    hasta: Math.min(total, posicion + capacidad),
  };
}
