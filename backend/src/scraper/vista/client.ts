import { load } from "cheerio";
import { configureRequests, request } from "../http.ts";
import type { CadenaVista, PlanoButacasVista } from "./types.ts";

export const CADENAS = {
  muvix: { nombre: "Muvix", sitio: "https://muvix.cl", logo: "/IT-CDN/Themes/_default/Images/logo_muvix.png" },
  cinestar: { nombre: "Cinestar", sitio: "https://cinestar.cl", logo: "/IT-CDN/Themes/_default/Images/cinestar-logo.png" },
};

const configuraciones = new Map<CadenaVista, { token: string; hasta: number }>();
const inicializando = new Map<CadenaVista, Promise<void>>();

export async function initializeVista(chain: CadenaVista, delayMs?: number) {
  if (delayMs !== undefined) configureRequests(delayMs);
  if ((configuraciones.get(chain)?.hasta ?? 0) > Date.now()) return;
  const pending = inicializando.get(chain);
  if (pending) return pending;
  const task = (async () => {
    const site = CADENAS[chain].sitio;
    const response = await request(`${site}/Browsing/`);
    if (!response.ok) throw new Error(`No se pudo abrir ${CADENAS[chain].nombre}.`);
    const doc = load(await response.text());
    const script = doc("script[src]").toArray().map((element) => doc(element).attr("src")!).find((src) => src.includes("/JsBundle/BrowsingHomeScripts"));
    if (!script) throw new Error(`Falta la configuracion publica de ${chain}.`);
    const url = new URL(script, site);
    if (url.origin !== site) throw new Error("Configuracion de cartelera en un dominio inesperado.");
    const bundle = await request(url.href);
    if (!bundle.ok) throw new Error(`No se pudo leer la configuracion de ${chain}.`);
    const source = await bundle.text();
    const token = source.match(/\bapiToken\s*=\s*["']([a-f\d]{32})["']/i)?.[1];
    if (!token) throw new Error(`Cambio la configuracion publica de ${chain}.`);
    configuraciones.set(chain, { token, hasta: Date.now() + 60 * 60_000 });
    const logo = doc("header img").first().attr("src");
    if (logo && new URL(logo, site).origin === site) CADENAS[chain].logo = logo;
  })().finally(() => inicializando.delete(chain));
  inicializando.set(chain, task);
  return task;
}

export async function vistaData<T>(chain: CadenaVista, collection: "Cinemas" | "ScheduledFilms" | "Sessions" | "SiteGroups" | "SiteGroupCinemaLinks"): Promise<T[]> {
  await initializeVista(chain);
  const site = CADENAS[chain].sitio;
  const path = `/WSVistaWebClient/OData.svc/${collection}`;
  const records: T[] = [];
  let url: string | undefined = `${site}${path}`;
  let refreshed = false;
  const pages = new Set<string>();
  while (url) {
    if (pages.has(url) || pages.size >= 100) throw new Error(`Paginacion invalida de ${chain}.`);
    const response = await request(url, { connectapitoken: configuraciones.get(chain)!.token });
    if ((response.status === 401 || response.status === 403) && !refreshed) {
      configuraciones.delete(chain);
      await initializeVista(chain);
      refreshed = true;
      continue;
    }
    if (!response.ok) throw new Error(`${chain} no devolvio ${collection}: HTTP ${response.status}.`);
    const data = await response.json() as { value: T[]; "odata.nextLink"?: string };
    if (!Array.isArray(data.value)) throw new Error(`Listado ${collection} invalido en ${chain}.`);
    records.push(...data.value);
    pages.add(url);
    const next: URL | undefined = data["odata.nextLink"] ? new URL(data["odata.nextLink"], url) : undefined;
    if (next && (next.origin !== site || next.pathname !== path || next.username || next.password)) throw new Error("Paginacion fuera de la cartelera publica.");
    url = next?.href;
  }
  return records;
}

export async function vistaSeatPlan(chain: CadenaVista, cinemaId: string, sessionId: string): Promise<PlanoButacasVista> {
  if (!/^\d+$/.test(cinemaId) || !/^\d+$/.test(sessionId)) throw new Error("Identidad de funcion invalida.");
  const url = `${CADENAS[chain].sitio}/WSVistaWebClient/RESTData.svc/cinemas/${cinemaId}/sessions/${sessionId}/seat-plan`;
  for (let intento = 0; intento < 2; intento++) {
    await initializeVista(chain);
    // Lectura publica del plano, sin una orden ni una seleccion de butacas.
    const response = await request(url, { connectapitoken: configuraciones.get(chain)!.token });
    if ((response.status === 401 || response.status === 403) && intento === 0) {
      await response.body?.cancel();
      configuraciones.delete(chain);
      continue;
    }
    if (!response.ok) throw new Error(`No se pudieron leer butacas de ${chain}: HTTP ${response.status}.`);
    const data = await response.json() as PlanoButacasVista;
    if (data?.ResponseCode !== 0) throw new Error(`El plano de butacas de ${chain} no esta disponible.`);
    return data;
  }
  throw new Error(`No se pudieron leer butacas de ${chain}.`);
}

export function purchaseUrl(chain: CadenaVista, cinemaId: string, sessionId: string) {
  if (!/^\d+$/.test(cinemaId) || !/^\d+$/.test(sessionId)) throw new Error("Identidad de funcion invalida.");
  const url = new URL("/Ticketing/visSelectTickets.aspx", CADENAS[chain].sitio);
  url.search = new URLSearchParams({ cinemacode: cinemaId, txtSessionId: sessionId, visLang: "1" }).toString();
  return url.href;
}

export async function ticketPage(chain: CadenaVista, cinemaId: string, sessionId: string) {
  const site = CADENAS[chain].sitio;
  let url = purchaseUrl(chain, cinemaId, sessionId);
  const cookies = new Map<string, string>();
  for (let hop = 0; hop < 4; hop++) {
    const response = await request(url, { Cookie: [...cookies.values()].join("; ") }, "manual");
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(";", 1)[0];
      cookies.set(pair.split("=", 1)[0], pair);
    }
    if (response.status >= 300 && response.status < 400) {
      await response.body?.cancel();
      const location = response.headers.get("location");
      if (!location) throw new Error("Redireccion de tarifas sin destino.");
      const next = new URL(location, url);
      if (next.origin !== site || next.pathname !== "/Ticketing/visSelectTickets.aspx" || next.username || next.password || next.searchParams.has("op")) throw new Error("El sitio no abrio la seleccion publica de entradas.");
      url = next.href;
      continue;
    }
    if (!response.ok) throw new Error(`No se pudieron leer tarifas de ${chain}: HTTP ${response.status}.`);
    return response.text();
  }
  throw new Error(`Demasiadas redirecciones al leer tarifas de ${chain}.`);
}
