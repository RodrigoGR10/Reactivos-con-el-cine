import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { startChromeSession, type ChromeSession } from "./browser.ts";
import { API_KEY, CINES_CINEPOLIS, purchaseUrl } from "./client.ts";
import type { ScrapedSchedule, ScrapedSession } from "../types.ts";

interface Ticket {
  id: string;
  ticketTypeCode: string;
  description: string;
  priceInCents: number;
  bookingFee: number;
  displaySequence: number;
  quantityAvailablePerOrder: number;
  loyaltyRecognitionId?: string | null;
  type: string;
  isPackageTicket: boolean;
  packageContent?: {
    tickets: Array<{ description: string; quantity: number }>;
    concessions: unknown[];
  } | null;
}

export interface Prices {
  data?: { tickets?: Array<{ areaCategoryCode: string; tickets: Ticket[] }> };
  errors?: unknown[];
}

const TICKETS_QUERY = `query Tickets($countryId: String!, $sessionId: String!, $cinemaVistaId: String!) {
  tickets(countryId: $countryId, cinemaVistaId: $cinemaVistaId, sessionId: $sessionId) {
    areaCategoryCode
    tickets {
      id ticketTypeCode description priceInCents bookingFee displaySequence
      quantityAvailablePerOrder loyaltyRecognitionId type isPackageTicket
      packageContent { tickets { description quantity } concessions { description } }
    }
  }
}`;

let browser: ChromeSession | undefined;
let queue = Promise.resolve();
let pending = 0;
let idle: ReturnType<typeof setTimeout> | undefined;
let lastRequest = 0;
let cooldownUntil = 0;

async function ticketData(cinemaVistaId: string, sessionId: string): Promise<Prices> {
  if (pending >= 100) throw new Error("Hay muchas consultas de Cinepolis en curso. Intenta mas tarde.");
  pending++;
  clearTimeout(idle);
  const queuedAt = Date.now();
  // Un solo navegador para el lote de horarios, separado del perfil de la sincronizacion.
  const task = queue.then(async () => {
    if (Date.now() - queuedAt > 60_000) throw new Error("La consulta de Cinepolis tardo demasiado. Intenta nuevamente.");
    if (Date.now() < cooldownUntil) throw new Error("Cinepolis no permite consultar ahora. Intenta mas tarde.");
    browser ??= await startChromeSession({
      profileDir: path.join(process.env.CHROME_USER_DATA_DIR || os.tmpdir(), "cinepolis-chrome-prices-profile"),
    });
    const cfg = {
      apiKey: API_KEY, query: TICKETS_QUERY,
      variables: { countryId: "CL", cinemaVistaId, sessionId },
    };
    await delay(Math.max(0, lastRequest + 500 - Date.now()));
    lastRequest = Date.now();
    const response = await browser.evaluate<{ status: number; json: Prices | null }>(`(async (cfg) => {
      const response = await fetch("https://api-g.cinepolis.com/v1/ticket/graphql", {
        method: "POST",
        headers: { "content-type": "application/json", "country-id": "CL", "x-apikey": cfg.apiKey },
        body: JSON.stringify({ operationName: "Tickets", query: cfg.query, variables: cfg.variables }),
        signal: AbortSignal.timeout(30000),
      });
      let json = null;
      try { json = await response.json(); } catch {}
      return { status: response.status, json };
    })(${JSON.stringify(cfg)})`);
    if (response.status === 403 || response.status === 429) cooldownUntil = Date.now() + 60_000;
    if (response.status !== 200 || !response.json || response.json.errors?.length || !Array.isArray(response.json.data?.tickets)) {
      throw new Error(`Cinepolis no devolvio las tarifas de la funcion (HTTP ${response.status}).`);
    }
    return response.json;
  }).catch((error: unknown) => {
    browser?.close();
    browser = undefined;
    throw error;
  }).finally(() => {
    pending--;
    if (pending === 0) {
      idle = setTimeout(() => {
        browser?.close();
        browser = undefined;
      }, 2000);
    }
  });
  queue = task.then(() => {}, () => {});
  return task;
}

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
      // Adulto Internet puede tener isPackageTicket=true sin ser un combo en el cliente web.
      const content = ticket.packageContent;
      if (content) {
        if (!Array.isArray(content.tickets) || !Array.isArray(content.concessions)) throw new Error("Contenido de tarifa de Cinepolis invalido.");
        if (content.concessions.length) continue;
        if (content.tickets.some((item) => !item || !Number.isSafeInteger(item.quantity) || item.quantity <= 0)) {
          throw new Error("Cantidad de entradas de Cinepolis invalida.");
        }
        if (content.tickets.length && content.tickets.reduce((total, item) => total + item.quantity, 0) !== 1) continue;
      }
      if (typeof ticket.id !== "string" || !ticket.id || typeof ticket.ticketTypeCode !== "string" || !ticket.ticketTypeCode) {
        throw new Error("Falta la identidad de la tarifa de Cinepolis.");
      }
      const precio = pesos(ticket.priceInCents, "Precio");
      const cargoServicio = pesos(ticket.bookingFee, "Cargo de servicio");
      if (precio === 0) continue;
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
  const response = await ticketData(cinema.vistaId, schedule.sesionId);
  return normalizePrices(response, {
    ...schedule, urlCompra: purchaseUrl(movieId, cinema.slug, schedule.sesionId),
  });
}
