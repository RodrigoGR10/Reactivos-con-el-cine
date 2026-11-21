import { CINES_CINEPOLIS } from "./client.ts";
import { consultaCinepolis } from "./consulta.ts";
import { normalizarButacas, type Butacas } from "../butacas.ts";

interface AsientoCinepolis {
    id: string;
    status: string;
    seatStyle: string;
    position: { areaNumber: number; rowIndex: number; columnIndex: number };
}

interface AreaCinepolis {
    number: number;
    numberOfSeats: number;
    isAllocatedSeating: boolean;
    rows: Array<{ seats: AsientoCinepolis[] }>;
}

interface ResultadoSeatsCinepolis {
    seatLayoutData?: { areas?: AreaCinepolis[] };
}

interface MapaCinepolis {
    data?: { seats?: ResultadoSeatsCinepolis };
}

// Limite observado en la API GraphQL de Cinepolis: hasta 3 alias por consulta (4 devuelve HTTP 400).
const TAMANO_LOTE_BUTACAS = 3;

const CAMPOS_BUTACAS = `seatLayoutData {
      areas {
        number numberOfSeats isAllocatedSeating
        rows { seats { id status seatStyle position { areaNumber rowIndex columnIndex } } }
      }
    }`;

const CONSULTA_BUTACAS = `query Seats($countryId: String!, $cinemaVistaId: String!, $sessionId: String!) {
  seats(countryId: $countryId, cinemaVistaId: $cinemaVistaId, sessionId: $sessionId) {
    ${CAMPOS_BUTACAS}
  }
}`;

function normalizarMapaButacas(
    areas: AreaCinepolis[] | undefined,
): Butacas | undefined {
    if (!Array.isArray(areas) || !areas.length) return undefined;
    let disponibles = 0;
    let total = 0;
    const posiciones = new Set<string>();
    for (const area of areas) {
        if (
            !area.isAllocatedSeating ||
            !Number.isSafeInteger(area.numberOfSeats) ||
            area.numberOfSeats < 0 ||
            !Array.isArray(area.rows)
        )
            return undefined;
        let butacasArea = 0;
        for (const fila of area.rows) {
            if (!Array.isArray(fila.seats)) return undefined;
            for (const asiento of fila.seats) {
                // Cinepolis excluye Broken de numberOfSeats, aunque esas posiciones aparecen en el mapa.
                if (
                    asiento.seatStyle === "Gap" ||
                    asiento.status === "Gap" ||
                    asiento.status === "Broken"
                )
                    continue;
                if (
                    !asiento.id?.trim() ||
                    !asiento.position ||
                    ![
                        asiento.position.areaNumber,
                        asiento.position.rowIndex,
                        asiento.position.columnIndex,
                    ].every(Number.isSafeInteger)
                )
                    return undefined;
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

export async function consultarButacasCinepolis(
    cineId: string,
    sesionId: string,
) {
    const cine = CINES_CINEPOLIS.find((item) => item.id === cineId);
    if (!cine || !/^\d+$/.test(sesionId))
        throw new Error("Identidad de funcion de Cinepolis invalida.");
    const respuesta = await consultaCinepolis<MapaCinepolis>(
        "Seats",
        CONSULTA_BUTACAS,
        {
            countryId: "CL",
            cinemaVistaId: cine.vistaId,
            sessionId: sesionId,
        },
    );
    return normalizarMapaButacas(respuesta.data?.seats?.seatLayoutData?.areas);
}

/**
 * Consulta butacas de multiples sesiones del mismo cine usando alias GraphQL.
 * Las sesiones cuyo lote falle quedan fuera del mapa para permitir fallback individual.
 */
export async function consultarButacasLoteCinepolis(
    cineId: string,
    sesionIds: string[],
    tamanoLote = TAMANO_LOTE_BUTACAS,
): Promise<Map<string, Butacas | undefined>> {
    const resultados = new Map<string, Butacas | undefined>();
    const cine = CINES_CINEPOLIS.find((item) => item.id === cineId);
    if (!cine) return resultados;

    const validas = [...new Set(sesionIds.filter((id) => /^\d+$/.test(id)))];
    for (let i = 0; i < validas.length; i += tamanoLote) {
        const lote = validas.slice(i, i + tamanoLote);
        const decls = lote.map((_, idx) => `$s${idx}: String!`).join(", ");
        const alias = lote
            .map(
                (_, idx) =>
                    `s${idx}: seats(countryId: $countryId, cinemaVistaId: $cinemaVistaId, sessionId: $s${idx}) { ${CAMPOS_BUTACAS} }`,
            )
            .join("\n  ");
        const variables: Record<string, string> = {
            countryId: "CL",
            cinemaVistaId: cine.vistaId,
        };
        lote.forEach((id, idx) => {
            variables[`s${idx}`] = id;
        });

        try {
            const respuesta = await consultaCinepolis<{
                data?: Record<string, ResultadoSeatsCinepolis | undefined>;
            }>(
                "SeatsBatch",
                `query SeatsBatch($countryId: String!, $cinemaVistaId: String!, ${decls}) {\n  ${alias}\n}`,
                variables,
            );
            lote.forEach((id, idx) => {
                resultados.set(
                    id,
                    normalizarMapaButacas(
                        respuesta.data?.[`s${idx}`]?.seatLayoutData?.areas,
                    ),
                );
            });
        } catch {
            // Se omite el lote fallido para que el flujo normal haga fallback sesion por sesion.
        }
    }
    return resultados;
}
