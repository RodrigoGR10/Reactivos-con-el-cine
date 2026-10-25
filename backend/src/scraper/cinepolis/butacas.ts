import { CINES_CINEPOLIS } from "./client.ts";
import { consultaCinepolis } from "./consulta.ts";
import { normalizarButacas } from "../butacas.ts";

interface AsientoCinepolis {
  id: string;
  status: string;
  seatStyle: string;
  position: { areaNumber: number; rowIndex: number; columnIndex: number };
}
interface MapaCinepolis {
  data?: { seats?: { seatLayoutData?: { areas?: Array<{
    number: number;
    numberOfSeats: number;
    isAllocatedSeating: boolean;
    rows: Array<{ seats: AsientoCinepolis[] }>;
  }> } } };
}

const CONSULTA_BUTACAS = `query Seats($countryId: String!, $cinemaVistaId: String!, $sessionId: String!) {
  seats(countryId: $countryId, cinemaVistaId: $cinemaVistaId, sessionId: $sessionId) {
    seatLayoutData {
      areas {
        number numberOfSeats isAllocatedSeating
        rows { seats { id status seatStyle position { areaNumber rowIndex columnIndex } } }
      }
    }
  }
}`;

export async function consultarButacasCinepolis(cineId: string, sesionId: string) {
  const cine = CINES_CINEPOLIS.find(item => item.id === cineId);
  if (!cine || !/^\d+$/.test(sesionId)) throw new Error("Identidad de funcion de Cinepolis invalida.");
  const respuesta = await consultaCinepolis<MapaCinepolis>("Seats", CONSULTA_BUTACAS, {
    countryId: "CL", cinemaVistaId: cine.vistaId, sessionId: sesionId,
  });
  const areas = respuesta.data?.seats?.seatLayoutData?.areas;
  if (!Array.isArray(areas) || !areas.length) return undefined;
  let disponibles = 0;
  let total = 0;
  const posiciones = new Set<string>();
  for (const area of areas) {
    if (!area.isAllocatedSeating || !Number.isSafeInteger(area.numberOfSeats) || area.numberOfSeats < 0 || !Array.isArray(area.rows)) return undefined;
    let butacasArea = 0;
    for (const fila of area.rows) {
      if (!Array.isArray(fila.seats)) return undefined;
      for (const asiento of fila.seats) {
        // Cinepolis excluye Broken de numberOfSeats, aunque esas posiciones aparecen en el mapa.
        if (asiento.seatStyle === "Gap" || asiento.status === "Gap" || asiento.status === "Broken") continue;
        if (!asiento.id?.trim() || !asiento.position || ![asiento.position.areaNumber, asiento.position.rowIndex, asiento.position.columnIndex].every(Number.isSafeInteger)) return undefined;
        const posicion = `${asiento.position.areaNumber}:${asiento.position.rowIndex}:${asiento.position.columnIndex}`;
        if (posiciones.has(posicion)) return undefined;
        posiciones.add(posicion);
        butacasArea++;
        // Empty es disponible en Cinepolis; los codigos numericos de otras cadenas no se reutilizan.
        if (asiento.status === "Empty") disponibles++;
      }
    }
    if (butacasArea !== area.numberOfSeats) return undefined;
    total += area.numberOfSeats;
  }
  return normalizarButacas(disponibles, total, new Date().toISOString());
}
