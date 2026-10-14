import { setTimeout as delay } from "node:timers/promises";
import LZString from "lz-string";

export const SITE = "https://www.cinemark.cl";

let baseUrl = "";
let interval = 500;
let lastRequest = 0;

async function request(url: string): Promise<Response> {
  for (let attempt = 0; attempt < 3; attempt++) {
    await delay(Math.max(0, interval - (Date.now() - lastRequest)));
    lastRequest = Date.now();
    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          Accept: "application/json, text/html",
          country: "CL",
          "User-Agent": "ReactivosCine/1.0 (cartelera publica)",
        },
        signal: AbortSignal.timeout(30_000),
      });
    } catch (error) {
      if (attempt === 2) throw error;
      await delay(1000 * 2 ** attempt);
      continue;
    }
    if (response.ok) return response;
    if ((response.status === 429 || response.status >= 500) && attempt < 2) {
      await response.body?.cancel();
      const retryAfter = response.headers.get("retry-after");
      const seconds = Number(retryAfter);
      const date = retryAfter ? Date.parse(retryAfter) : NaN;
      const retryMs = seconds > 0 ? seconds * 1000 : Number.isFinite(date) ? date - Date.now() : 1000 * 2 ** attempt;
      if (retryMs > 60_000) throw new Error(`Cinemark solicita esperar ${retryAfter}. Ejecuta el scraper mas tarde.`);
      await delay(Math.max(0, retryMs));
      continue;
    }
    await response.body?.cancel();
    throw new Error(`Cinemark HTTP ${response.status}: ${new URL(url).pathname}`);
  }
  throw new Error("No se pudo consultar Cinemark.");
}

export async function initializeCinemark(delayMs = 500): Promise<void> {
  if (!Number.isSafeInteger(delayMs) || delayMs < 250) throw new Error("La pausa debe ser un entero >= 250 ms.");
  interval = delayMs;
  baseUrl = "";
  const response = await request(SITE);
  const cookie = response.headers.getSetCookie().find((value) => value.startsWith("CNK_PUBLIC_ENVS="));
  await response.body?.cancel();
  if (!cookie) throw new Error("Cinemark no publico su configuracion (CNK_PUBLIC_ENVS).");
  const encoded = decodeURIComponent(cookie.split(";")[0].slice("CNK_PUBLIC_ENVS=".length));
  const decoded = LZString.decompressFromEncodedURIComponent(encoded);
  if (!decoded) throw new Error("Configuracion publica de Cinemark invalida.");
  const config = JSON.parse(decoded);
  const base = new URL(config.CLIENT_BFF_BASE_URL);
  if (base.protocol !== "https:" || !base.hostname.endsWith(".cinemark.cl") || config.COUNTRY !== "CL") {
    throw new Error("La configuracion publica no corresponde a Cinemark Chile.");
  }
  baseUrl = base.href.replace(/\/$/, "");
}

export async function cinemarkData<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  if (!baseUrl) throw new Error("Inicializa Cinemark antes de consultar su API.");
  const url = new URL(`${baseUrl}${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const payload = await (await request(url.href)).json();
  if (!payload || !Object.hasOwn(payload, "data")) throw new Error(`Respuesta invalida en ${path}.`);
  if (payload.code !== undefined && payload.code !== 0) throw new Error(`Cinemark devolvio codigo ${payload.code} en ${path}.`);
  return payload.data as T;
}
