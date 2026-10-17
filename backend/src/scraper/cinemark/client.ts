import LZString from "lz-string";
import { configureRequests, request } from "../http.ts";

export const SITE = "https://www.cinemark.cl";

let baseUrl = "";
let initialization: Promise<void> | undefined;

export async function ensureCinemark(): Promise<void> {
  if (baseUrl) return;
  if (!initialization) {
    initialization = initializeCinemark().finally(() => { initialization = undefined; });
  }
  await initialization;
}

export async function initializeCinemark(delayMs = 500): Promise<void> {
  configureRequests(delayMs);
  baseUrl = "";
  const response = await request(SITE, { country: "CL" });
  if (!response.ok) { await response.body?.cancel(); throw new Error(`Cinemark HTTP ${response.status}.`); }
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
  const response = await request(url.href, { country: "CL" });
  if (!response.ok) { await response.body?.cancel(); throw new Error(`Cinemark HTTP ${response.status}: ${path}`); }
  const payload = await response.json();
  if (!payload || !Object.hasOwn(payload, "data")) throw new Error(`Respuesta invalida en ${path}.`);
  if (payload.code !== undefined && payload.code !== 0) throw new Error(`Cinemark devolvio codigo ${payload.code} en ${path}.`);
  return payload.data as T;
}
