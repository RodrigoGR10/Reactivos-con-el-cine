import { normalizarButacas } from "../butacas.ts";
import { vistaSeatPlan } from "./client.ts";
import type { CadenaVista } from "./types.ts";

export async function consultarButacasVista(cadena: CadenaVista, cineId: string, sesionId: string) {
  const respuesta = await vistaSeatPlan(cadena, cineId, sesionId);
  const areas = respuesta.SeatLayoutData?.Areas;
  if (!Array.isArray(areas) || !areas.length) return undefined;
  let disponibles = 0;
  let total = 0;
  const numerosAreas = new Set<number>();
  const posiciones = new Set<string>();
  for (const area of areas) {
    if (!Number.isSafeInteger(area.Number) || area.Number < 0 || numerosAreas.has(area.Number)
      || !area.IsAllocatedSeating || !Number.isSafeInteger(area.NumberOfSeats) || area.NumberOfSeats < 0
      || !Array.isArray(area.Rows)) return undefined;
    numerosAreas.add(area.Number);
    let butacasArea = 0;
    for (const fila of area.Rows) {
      if (!Array.isArray(fila.Seats)) return undefined;
      for (const asiento of fila.Seats) {
        if (!Number.isSafeInteger(asiento.Status) || asiento.Status < 0 || asiento.Status > 7) return undefined;
        // Vista: 5 = Broken y 6 = Placeholder; no forman parte de la capacidad comercial.
        if (asiento.Status === 5 || asiento.Status === 6) continue;
        const posicion = asiento.Position;
        if (!asiento.Id?.trim() || !posicion || posicion.AreaNumber !== area.Number
          || ![posicion.RowIndex, posicion.ColumnIndex].every(valor => Number.isSafeInteger(valor) && valor >= 0)) return undefined;
        const clave = `${posicion.AreaNumber}:${posicion.RowIndex}:${posicion.ColumnIndex}`;
        if (posiciones.has(clave)) return undefined;
        posiciones.add(clave);
        // Cada posicion cuenta una vez; SeatsInGroup describe sofas, no asientos adicionales.
        butacasArea++;
        if (asiento.Status === 0) disponibles++;
      }
    }
    if (butacasArea !== area.NumberOfSeats) return undefined;
    total += area.NumberOfSeats;
  }
  return normalizarButacas(disponibles, total, new Date().toISOString());
}
