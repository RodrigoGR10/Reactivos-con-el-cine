import { CINES_CINEPOLIS, purchaseUrl } from "./client.ts";
import { consultaCinepolis } from "./consulta.ts";
import type { ScrapedSchedule, ScrapedSession } from "../types.ts";

// La consulta GraphQL Tickets de Cinepolis devuelve bookingFee: null; segun la seccion 5
// de sus Terminos y Condiciones ("Cargo por servicio digital"), el recargo web es $700 por entrada.
const CARGO_SERVICIO_DIGITAL_CLP = 700;

interface TicketConcession {
  description?: string | null;
  displayName?: string | null;
  charge?: number | null;
  quantity?: number | null;
}

interface Ticket {
  id: string;
  ticketTypeCode: string;
  description: string;
  priceInCents: number;
  bookingFee?: number | null;
  displaySequence: number;
  quantityAvailablePerOrder: number;
  loyaltyRecognitionId?: string | null;
  type: string;
  isPackageTicket: boolean;
  packageContent?: {
    tickets: Array<{ description: string; quantity: number }>;
    concessions: TicketConcession[];
  } | null;
}

export interface Prices {
  data?: { tickets?: Array<{ areaCategoryCode: string; tickets: Ticket[] }> };
  errors?: unknown[];
}

// Limite observado en la API GraphQL de Cinepolis: hasta 3 alias por consulta (4 devuelve HTTP 400).
const TAMANO_LOTE_TARIFAS = 3;

const CAMPOS_TARIFAS = `areaCategoryCode
    tickets {
      id ticketTypeCode description priceInCents bookingFee displaySequence
      quantityAvailablePerOrder loyaltyRecognitionId type isPackageTicket
      packageContent { tickets { description quantity } concessions { description displayName charge quantity } }
    }`;

const TICKETS_QUERY = `query Tickets($countryId: String!, $sessionId: String!, $cinemaVistaId: String!) {
  tickets(countryId: $countryId, cinemaVistaId: $cinemaVistaId, sessionId: $sessionId) {
    ${CAMPOS_TARIFAS}
  }
}`;

function pesos(cents: number, field: string): number {
  if (!Number.isSafeInteger(cents) || cents < 0 || cents % 100 !== 0) {
    throw new Error(`${field} de Cinepolis invalido.`);
  }
  return cents / 100;
}

export function normalizePrices(response: Prices, schedule: ScrapedSchedule): ScrapedSession[] {
  if (response.errors?.length || !Array.isArray(response.data?.tickets)) {
    throw new Error("Cinepolis no devolvio una lista valida de tarifas.");
  }
  const result: Array<{ tarifa: ScrapedSession; sequence: number }> = [];
  const seen = new Set<string>();
  for (const area of response.data.tickets) {
    if (!area || typeof area.areaCategoryCode !== "string" || !area.areaCategoryCode || !Array.isArray(area.tickets)) {
      throw new Error("Area de tarifas de Cinepolis invalida.");
    }
    for (const ticket of area.tickets) {
      if (!ticket || typeof ticket.description !== "string") throw new Error("Tarifa de Cinepolis invalida.");
      const title = ticket.description.trim();
      const normalized = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
      if (!/^(?:ADULTO|GENERAL)\b/.test(normalized) || /PROMO|SOCIO|PACK|COMBO|CONVENIO|DESCUENTO|NINO|EDAD|ESTUDIANTE|CUPON|2X1|BANCO/.test(normalized)) continue;
      if (ticket.type !== "general" || ticket.loyaltyRecognitionId || !(ticket.quantityAvailablePerOrder > 0)) continue;
      // Adulto Internet puede tener isPackageTicket=true sin ser un combo en el cliente web,
      // y en funciones 3D incluye el arriendo obligatorio de lentes 3D en packageContent.concessions.
      let recargoExtras = 0;
      const content = ticket.packageContent;
      if (content) {
        if (!Array.isArray(content.tickets) || !Array.isArray(content.concessions)) throw new Error("Contenido de tarifa de Cinepolis invalido.");
        let esComboConfiteria = false;
        for (const item of content.concessions) {
          if (!item || typeof item !== "object") throw new Error("Concesion de tarifa de Cinepolis invalida.");
          const etiqueta = `${item.displayName ?? ""} ${item.description ?? ""}`
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toUpperCase();
          if (!/\bLENTES\s*3D\b/.test(etiqueta) && !/^\s*(?:CARGO|COSTO)\s+POR\s+SERVICIO\s*$/.test(etiqueta)) {
            esComboConfiteria = true;
            break;
          }
          const cantidad = item.quantity ?? 1;
          if (!Number.isSafeInteger(cantidad) || cantidad <= 0) {
            throw new Error("Cantidad de recargo extra de Cinepolis invalida.");
          }
          const cobro = item.charge == null ? 0 : pesos(item.charge, "Recargo extra");
          recargoExtras += cobro * cantidad;
        }
        if (esComboConfiteria) continue;
        if (content.tickets.some((item) => !item || !Number.isSafeInteger(item.quantity) || item.quantity <= 0)) {
          throw new Error("Cantidad de entradas de Cinepolis invalida.");
        }
        if (content.tickets.length && content.tickets.reduce((total, item) => total + item.quantity, 0) !== 1) continue;
      }
      if (typeof ticket.id !== "string" || !ticket.id || typeof ticket.ticketTypeCode !== "string" || !ticket.ticketTypeCode) {
        throw new Error("Falta la identidad de la tarifa de Cinepolis.");
      }
      const precioBase = pesos(ticket.priceInCents, "Precio");
      if (precioBase === 0) continue;
      const precio = precioBase + recargoExtras;
      const cargoServicio = ticket.bookingFee == null
        ? CARGO_SERVICIO_DIGITAL_CLP
        : pesos(ticket.bookingFee, "Cargo de servicio");
      const sourceId = `${schedule.origenId}:${area.areaCategoryCode}:${ticket.ticketTypeCode}`;
      if (seen.has(sourceId)) throw new Error("Tarifa duplicada en la misma funcion de Cinepolis.");
      seen.add(sourceId);
      result.push({
        sequence: Number.isFinite(ticket.displaySequence) ? ticket.displaySequence : Number.MAX_SAFE_INTEGER,
        tarifa: {
          id: `cinepolis:${sourceId}`, origen: "cinepolis", origenId: sourceId, extraidoEn: new Date().toISOString(),
          peliculaId: schedule.peliculaId, cineId: schedule.cineId, fecha: schedule.fecha, fechaCartelera: schedule.fechaCartelera,
          horario: schedule.horario, formato: schedule.formatoResumen, idioma: schedule.idioma, sala: schedule.sala,
          precio, cargoServicio, precioOnline: precio + cargoServicio,
          tipoEntrada: title, urlCompra: schedule.urlCompra!, agotada: schedule.agotada,
        },
      });
    }
  }
  return result.sort((a, b) => a.sequence - b.sequence).map(({ tarifa }) => tarifa);
}

export async function pricesForSchedule(schedule: ScrapedSchedule): Promise<ScrapedSession[]> {
  const cinemaId = schedule.cineId.slice("cinepolis:".length);
  const cinema = CINES_CINEPOLIS.find((item) => item.id === cinemaId);
  const movieId = schedule.peliculaId.slice("cinepolis:".length);
  if (schedule.origen !== "cinepolis" || !schedule.cineId.startsWith("cinepolis:") || !schedule.peliculaId.startsWith("cinepolis:") || !cinema || !movieId || !/^\d+$/.test(schedule.sesionId)) {
    throw new Error("Identidad de funcion de Cinepolis invalida.");
  }
  const response = await consultaCinepolis<Prices>("Tickets", TICKETS_QUERY, { countryId: "CL", cinemaVistaId: cinema.vistaId, sessionId: schedule.sesionId });
  return normalizePrices(response, {
    ...schedule, urlCompra: purchaseUrl(movieId, cinema.slug, schedule.sesionId),
  });
}

/**
 * Consulta tarifas de multiples sesiones del mismo cine usando alias GraphQL.
 * Las sesiones cuyo lote falle quedan fuera del mapa para permitir fallback individual.
 */
export async function pricesForSchedules(
  schedules: ScrapedSchedule[],
  tamanoLote = TAMANO_LOTE_TARIFAS,
): Promise<Map<string, ScrapedSession[]>> {
  const resultados = new Map<string, ScrapedSession[]>();
  const primero = schedules[0];
  if (!primero || primero.origen !== "cinepolis" || !primero.cineId.startsWith("cinepolis:")) {
    return resultados;
  }
  const cinemaId = primero.cineId.slice("cinepolis:".length);
  const cinema = CINES_CINEPOLIS.find((item) => item.id === cinemaId);
  if (!cinema) return resultados;

  const validos = schedules.filter(
    (s) =>
      s.origen === "cinepolis" &&
      s.cineId === primero.cineId &&
      s.peliculaId.startsWith("cinepolis:") &&
      s.peliculaId.length > "cinepolis:".length &&
      /^\d+$/.test(s.sesionId),
  );

  for (let i = 0; i < validos.length; i += tamanoLote) {
    const lote = validos.slice(i, i + tamanoLote);
    const decls = lote.map((_, idx) => `$s${idx}: String!`).join(", ");
    const alias = lote
      .map(
        (_, idx) =>
          `s${idx}: tickets(countryId: $countryId, cinemaVistaId: $cinemaVistaId, sessionId: $s${idx}) { ${CAMPOS_TARIFAS} }`,
      )
      .join("\n  ");
    const variables: Record<string, string> = {
      countryId: "CL",
      cinemaVistaId: cinema.vistaId,
    };
    lote.forEach((s, idx) => {
      variables[`s${idx}`] = s.sesionId;
    });

    try {
      const response = await consultaCinepolis<{
        data?: Record<string, Array<{ areaCategoryCode: string; tickets: Ticket[] }> | undefined>;
      }>("TicketsBatch", `query TicketsBatch($countryId: String!, $cinemaVistaId: String!, ${decls}) {\n  ${alias}\n}`, variables);
      lote.forEach((schedule, idx) => {
        const movieId = schedule.peliculaId.slice("cinepolis:".length);
        const tickets = response.data?.[`s${idx}`];
        if (!Array.isArray(tickets)) return;
        try {
          resultados.set(
            schedule.sesionId,
            normalizePrices(
              { data: { tickets } },
              { ...schedule, urlCompra: purchaseUrl(movieId, cinema.slug, schedule.sesionId) },
            ),
          );
        } catch {
          // Si falla la normalizacion de una sesion, se deja para el fallback individual.
        }
      });
    } catch {
      // Se omite el lote fallido para que el flujo normal haga fallback sesion por sesion.
    }
  }

  return resultados;
}
