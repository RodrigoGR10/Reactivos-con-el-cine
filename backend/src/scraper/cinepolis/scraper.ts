import fs from "node:fs";
import path from "node:path";
import { CINES_CINEPOLIS, SITE } from "./client.ts";
import { normalizeCinema, normalizeMovie, normalizeSchedule } from "./normalize.ts";
import { startChromeSession } from "./browser.ts";
import { localNow } from "../../utils/localNow.ts";
import type { CinepolisCinema, CinepolisMovie, CinepolisShowtime, FormatoFuente, Proyeccion } from "./types.ts";
import type { ScrapedCinema, ScrapedMovie, ScrapedSchedule, ScrapeOptions, ScrapeResult } from "../types.ts";

type Incidencia = NonNullable<ScrapeResult["incidencias"]>[number];
type Severidad = "error" | "aviso" | "info";

const API_URL = "https://api-g.cinepolis.com/v2/billboards/graphql";
// Clave observada en el sitio público. Preferible definirla en la variable CINEPOLIS_API_KEY.
const API_KEY = process.env.CINEPOLIS_API_KEY || "lQM6Mkvri1iHksKKCfpAiwGXq0YUZA7Nn6XAXRPr4i13LwXo";
const COUNTRY_ID = "CL";
const ZONA = "America/Santiago";
const DEBUG = process.env.CINEPOLIS_DEBUG === "1";
const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;
const AGOTADA_RE = /AGOT|SOLD|FULL|UNAVAIL|NO\s*DISP|^0$/i;
const SALAS_4DX = ["la-reina", "parque-arauco", "los-dominicos", "arauco-maipu", "vivo-coquimbo"];
const GENERICAS = new Set(["", "TRADICIONAL", "REGULAR", "ESTÁNDAR", "ESTANDAR", "GENERAL", "DIGITAL"]);
const HORA_SANTIAGO = new Intl.DateTimeFormat("en-GB", {
  timeZone: ZONA,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/**
 * Código que se ejecuta dentro de Chrome, en el contexto de cinepolis.com.
 * Importante: no usar backticks ni la secuencia dollar-llave dentro de este texto.
 * Por cada cine prueba los identificadores candidatos en orden y registra cada intento,
 * para que una respuesta de error o vacía no se pierda en silencio.
 */
const PAGE_SCRIPT = `async (cfg) => {
  const post = async (body) => {
    try {
      const res = await fetch(cfg.apiUrl, {
        method: "POST",
        headers: { "content-type": "application/json", "country-id": cfg.countryId, "x-apikey": cfg.apiKey },
        body: JSON.stringify(body),
      });
      const texto = await res.text();
      let json = null;
      try { json = JSON.parse(texto); } catch (e) {}
      return { status: res.status, json, texto: json ? null : texto.slice(0, 300) };
    } catch (e) {
      return { status: 0, json: null, texto: String(e) };
    }
  };

  const MOVIES_QUERY = 'query Movies($countryId: String!, $limit: Int) { movies(countryId: $countryId, limit: $limit) { edges { node { id name originalName genre rating ratingDescription length releaseDate synopsis media { resource type code sizes { large } } } } } }';
  const BILLBOARD_QUERY = 'query Billboard($countryId: String!, $cinemaId: String!, $timezone: String!, $isAbsoluteExperiencePath: Boolean) { billboardByCinema(countryId: $countryId, cinemaId: $cinemaId, timezone: $timezone, isAbsoluteExperiencePath: $isAbsoluteExperiencePath) { schedules { movieId dates { date languages { language displayLanguage showtimes { format { name } experience { name } sessionId datetime screen movieVistaId cinemaVistaId availability } } } } } }';

  const errores = [];
  const m = await post({ operationName: "Movies", variables: { countryId: cfg.countryId, limit: cfg.movieLimit }, query: MOVIES_QUERY });
  const edges = m.json && m.json.data && m.json.data.movies ? m.json.data.movies.edges : null;
  if (!Array.isArray(edges)) {
    errores.push({ tipo: "cartelera_error", status: m.status, errores: m.json && m.json.errors ? m.json.errors : null, texto: m.texto });
  }
  const movies = Array.isArray(edges) ? edges.map((e) => e && e.node).filter(Boolean) : [];

  const consultar = async (cine) => {
    const intentos = [];
    let respondio = false;
    for (const cinemaId of cine.candidatos) {
      const r = await post({
        operationName: "Billboard",
        variables: { countryId: cfg.countryId, cinemaId: String(cinemaId), timezone: cfg.timezone, isAbsoluteExperiencePath: true },
        query: BILLBOARD_QUERY,
      });
      const bb = r.json && r.json.data ? r.json.data.billboardByCinema : null;
      const schedules = bb && Array.isArray(bb.schedules) ? bb.schedules : null;
      intentos.push({
        cinemaId: String(cinemaId),
        status: r.status,
        errores: r.json && r.json.errors ? r.json.errors : null,
        texto: r.texto,
        schedules: schedules ? schedules.length : null,
      });
      if (schedules) {
        respondio = true;
        if (schedules.length > 0) {
          return { estado: "ok", idUsado: String(cinemaId), schedules, intentos, raw: cfg.debug ? r.json : undefined };
        }
      }
    }
    return { estado: respondio ? "vacio" : "error", idUsado: null, schedules: [], intentos };
  };

  const billboards = {};
  for (let i = 0; i < cfg.cinemas.length; i += cfg.concurrency) {
    const lote = cfg.cinemas.slice(i, i + cfg.concurrency);
    const resultados = await Promise.all(lote.map((c) => consultar(c).then((r) => [c.id, r])));
    for (const [id, r] of resultados) billboards[id] = r;
    if (i + cfg.concurrency < cfg.cinemas.length) {
      await new Promise((resolve) => setTimeout(resolve, cfg.pausaMs));
    }
  }

  return { movies, errores, billboards };
}`;

interface RawGqlMovie {
  id: string;
  name: string;
  originalName?: string;
  genre?: string[] | string;
  rating?: string;
  ratingDescription?: string;
  length?: string | number;
  releaseDate?: string;
  synopsis?: string;
  media?: Array<{
    resource?: string;
    type?: string;
    code?: string;
    sizes?: { large?: string; medium?: string; small?: string };
  }>;
}

interface RawGqlShowtime {
  format?: { name?: string } | null;
  experience?: { name?: string } | null;
  sessionId: string | number;
  datetime?: string;
  screen?: string | number | null;
  movieVistaId?: string | number | null;
  cinemaVistaId?: string | number | null;
  availability?: string | number | null;
}

interface RawGqlLanguage {
  language?: string;
  displayLanguage?: string;
  showtimes?: RawGqlShowtime[];
}

interface RawGqlDate {
  date: string;
  languages?: RawGqlLanguage[];
}

interface RawGqlSchedule {
  movieId: string;
  dates?: RawGqlDate[];
}

interface PageResult {
  movies: RawGqlMovie[];
  errores: Array<{ tipo: string; status?: number; errores?: unknown; texto?: string | null }>;
  billboards: Record<
    string,
    {
      estado: "ok" | "vacio" | "error";
      idUsado: string | null;
      schedules: RawGqlSchedule[];
      intentos: unknown[];
      raw?: unknown;
    }
  >;
}

export interface FormatoSala {
  proyeccion: Proyeccion;
  experiencia: string | null;
  resumen: string;
  fuente: FormatoFuente;
}

export interface FormatoInput {
  formatName?: string | null;
  experienceName?: string | null;
  screen?: string | number | null;
  cinemaId?: string;
  movieSlugOrTitle?: string;
}

const txt = (v: unknown): string | null => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
};

const mensajeError = (err: unknown) => (err instanceof Error ? err.message : String(err));

function incidencia(tipo: string, severidad: Severidad, mensaje: string, extra: Record<string, unknown> = {}): Incidencia {
  // Ajustar al tipo real de Incidencia en ../types.ts si difiere.
  return { origen: "cinepolis", tipo, severidad, mensaje, ...extra } as unknown as Incidencia;
}

function sumarDias(fecha: string, dias: number): string {
  const [y, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + dias)).toISOString().slice(0, 10);
}

/** Convierte duraciones como 135, "135 min", "2h 15m", "2:15" o "PT2H15M" a minutos. */
export function parseDuracion(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isInteger(raw) && raw > 0 ? raw : null;
  if (typeof raw !== "string") return null;
  const s = raw.trim().toLowerCase();

  let m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (m) return Number(m[1]) * 60 + Number(m[2]);

  m = s.match(/^pt(?:(\d+)h)?(?:(\d+)m)?$/);
  if (m && (m[1] || m[2])) return Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0);

  m = s.match(/^(\d+)\s*h\w*(?:\s*(\d+)\s*m\w*)?$/);
  if (m) return Number(m[1]) * 60 + Number(m[2] ?? 0);

  m = s.match(/^(\d+)\s*(?:m|min|mins|minutos?)?$/);
  if (m) return Number(m[1]);

  return null;
}

function normalizarClasificacion(raw?: string | null): string {
  if (!raw) return "TE";
  const con = raw.startsWith("+") ? raw : `+${raw}`;
  if (con === "+TE") return "TE";
  if (con === "+TE7") return "TE+7";
  return con;
}

function idiomaDesde(lang: RawGqlLanguage): { normalizado: string; raw: string | null } {
  const raw = txt(lang.displayLanguage) ?? txt(lang.language);
  const t = `${lang.language ?? ""} ${lang.displayLanguage ?? ""}`.toUpperCase();
  if (t.includes("SUB")) return { normalizado: "Subtitulada", raw };
  if (/DOB|ESP|LATINO/.test(t)) return { normalizado: "Doblada", raw };
  return { normalizado: raw ?? "Doblada", raw };
}

/** Hora local de Santiago (HH:MM). Si la fecha-hora trae zona, la convierte; si no, la toma tal cual. */
function horaLocal(datetime: string | null): string | null {
  if (!datetime) return null;
  const m = datetime.match(/^\d{4}-\d{2}-\d{2}[T ](\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/);
  if (!m) return null;
  if (!m[3]) return `${m[1]}:${m[2]}`;
  const d = new Date(datetime.replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? null : HORA_SANTIAGO.format(d);
}

function desdeExperiencia(texto: string, p: Proyeccion, infinity: boolean): { experiencia: string; resumen: string } {
  if (texto.includes("4DX") || texto.includes("4D")) {
    return infinity
      ? { experiencia: "4D INFINITY VISION", resumen: `4D ${p} INFINITY VISION` }
      : { experiencia: "4DX", resumen: `4DX ${p}` };
  }
  if (texto.includes("IMAX")) return { experiencia: "IMAX", resumen: `${p} IMAX` };
  if (texto.includes("VIP") || texto.includes("PREMIUM")) return { experiencia: "VIP", resumen: `VIP ${p}` };
  if (texto.includes("JUNIOR")) return { experiencia: "JUNIOR", resumen: `JUNIOR ${p}` };
  if (texto.includes("PLUUS") || texto.includes("PLUUX")) return { experiencia: "PLUUS", resumen: `PLUUS ${p}` };
  if (texto.includes("MACRO")) return { experiencia: "MACRO XE", resumen: `MACRO XE ${p}` };
  return { experiencia: texto, resumen: `${p} ${texto}` };
}

/**
 * Determina proyección y experiencia. Prioridad: dato de la API; luego heurísticas,
 * que quedan marcadas con fuente "heuristica" para que se puedan filtrar o revisar.
 */
export function resolveCinepolisFormat(input: FormatoInput): FormatoSala {
  const proyeccion: Proyeccion = (input.formatName ?? "").toUpperCase().includes("3D") ? "3D" : "2D";
  const limpiar = (t?: string | null) => (t ?? "").toUpperCase().replace(/\b[23]D\b/g, " ").replace(/\s+/g, " ").trim();
  const exp = limpiar(input.experienceName);
  const fmt = limpiar(input.formatName);
  const infinity = /infinity[\s-]?vision/i.test(input.movieSlugOrTitle ?? "");

  const texto = [exp, fmt].find((t) => t && !GENERICAS.has(t));
  if (texto) {
    const d = desdeExperiencia(texto, proyeccion, infinity);
    return { proyeccion, experiencia: d.experiencia, resumen: d.resumen, fuente: "api" };
  }

  const cine = (input.cinemaId ?? "").toLowerCase();
  const sala = String(input.screen ?? "").toUpperCase().replace(/^SALA\s*/, "").trim();
  const pelicula = (input.movieSlugOrTitle ?? "").toLowerCase();
  const porHeuristica = (t: string): FormatoSala => {
    const d = desdeExperiencia(t, proyeccion, infinity);
    return { proyeccion, experiencia: d.experiencia, resumen: d.resumen, fuente: "heuristica" };
  };

  if (cine.includes("premium") || cine.includes("casa-costanera")) return porHeuristica("VIP");
  if (SALAS_4DX.some((c) => cine.includes(c)) && sala === "1") return porHeuristica("4DX");
  if (cine.includes("plaza-egana") && sala === "11") return porHeuristica("IMAX");
  if (pelicula.includes("4dx")) return porHeuristica("4DX");
  if (pelicula.includes("imax")) return porHeuristica("IMAX");
  if (infinity) return porHeuristica("INFINITY VISION");

  return { proyeccion, experiencia: null, resumen: proyeccion, fuente: "por_defecto" };
}

function buildPosterUrl(rawPath?: string, resourceName?: string): string {
  if (!rawPath) return "https://cinepolis.com/placeholder.jpg";
  if (/^https?:\/\//.test(rawPath)) return rawPath;
  let clean = rawPath.replace(/^\/pimcore\/\d+\//, "").replace(/^\/+|\/+$/g, "");
  if (!/\.(jpe?g|png|webp)$/i.test(clean)) {
    const extMatch = (resourceName || "").match(/\.(jpe?g|png|webp)$/i);
    clean += extMatch ? extMatch[0].toLowerCase() : ".jpg";
  }
  return `https://pimcore-content.cinepolis.com/${clean}`;
}

function movieDesdeApi(raw: RawGqlMovie): CinepolisMovie {
  const posterItem =
    raw.media?.find((m) => m.code === "poster") ||
    raw.media?.find((m) => m.code === "movie_card") ||
    raw.media?.find((m) => m.type === "image");
  const duracion = parseDuracion(raw.length);
  const genero = Array.isArray(raw.genre) ? raw.genre.filter(Boolean).join(", ") : (raw.genre ?? "");
  const posterPath = posterItem?.sizes?.large || posterItem?.resource;
  return {
    id: raw.id,
    title: raw.name,
    originalTitle: raw.originalName || undefined,
    slug: raw.id,
    runTime: duracion ?? 100,
    genre: genero || "General",
    rating: normalizarClasificacion(raw.rating),
    ratingDescription: raw.ratingDescription || undefined,
    synopsis: raw.synopsis || "Sin sinopsis disponible.",
    poster: buildPosterUrl(posterPath, posterItem?.resource),
    releaseDate: raw.releaseDate ? raw.releaseDate.slice(0, 10) : undefined,
    datosIncompletos: duracion === null || !posterItem,
  };
}

function peliculaMinima(movieId: string): CinepolisMovie {
  return {
    id: movieId,
    title: movieId.replace(/-/g, " ").toUpperCase(),
    slug: movieId,
    runTime: 100,
    genre: "General",
    rating: "TE",
    synopsis: "Sin sinopsis disponible.",
    poster: "https://cinepolis.com/placeholder.jpg",
    datosIncompletos: true,
  };
}

function guardarDebug(raw: PageResult): void {
  const dir = path.join(process.cwd(), "debug");
  fs.mkdirSync(dir, { recursive: true });
  const archivo = path.join(dir, `cinepolis-raw-${Date.now()}.json`);
  fs.writeFileSync(archivo, JSON.stringify(raw, null, 2));
  console.error(`[cinepolis] Respuesta cruda guardada en ${archivo}`);
}

async function obtenerDatos(config: unknown): Promise<PageResult> {
  const session = await startChromeSession();
  try {
    return await session.evaluate<PageResult>(`(${PAGE_SCRIPT})(${JSON.stringify(config)})`);
  } finally {
    session.close();
  }
}

export async function listCinemas(): Promise<CinepolisCinema[]> {
  return CINES_CINEPOLIS;
}

export async function scrapeCinepolis(options: ScrapeOptions): Promise<ScrapeResult> {
  if (!FECHA_RE.test(options.desde)) {
    throw new Error(`Fecha "desde" inválida: ${options.desde}. Usa YYYY-MM-DD.`);
  }

  const startedAt = new Date().toISOString();
  const allCinemas = await listCinemas();

  for (const selector of options.cines) {
    const existe = allCinemas.some(
      (c) =>
        c.id === selector ||
        c.slug === selector ||
        c.vistaId === selector ||
        c.id.includes(selector) ||
        c.slug.includes(selector),
    );
    if (!existe) throw new Error(`Cine desconocido: ${selector}. Usa --list-cinemas.`);
  }

  const selected = allCinemas.filter((c) => {
    if (!options.cines.length) return true;
    return options.cines.some(
      (s) => c.id === s || c.slug === s || c.vistaId === s || c.id.includes(s) || c.slug.includes(s),
    );
  });

  const maxDate = options.dias ? sumarDias(options.desde, options.dias - 1) : null;

  const incidencias: Incidencia[] = [];
  let errores = 0;
  const registrar = (tipo: string, severidad: Severidad, mensaje: string, extra: Record<string, unknown> = {}) => {
    if (severidad === "error") {
      errores++;
      incidencias.push(incidencia(tipo, severidad, mensaje, extra));
    } else if (DEBUG) {
      console.error(`[cinepolis][${severidad}] ${tipo}: ${mensaje}`);
    }
  };

  const raw = await obtenerDatos({
    apiUrl: API_URL,
    apiKey: API_KEY,
    countryId: COUNTRY_ID,
    timezone: ZONA,
    movieLimit: 120,
    concurrency: 4,
    pausaMs: 200,
    debug: DEBUG,
    cinemas: selected.map((c) => ({ id: c.id, candidatos: [c.id, c.vistaId] })),
  });

  if (DEBUG) guardarDebug(raw);

  for (const e of raw.errores) {
    registrar(e.tipo, "error", `Error consultando ${e.tipo}.`, { detalle: e });
  }

  const movieMap = new Map<string, CinepolisMovie>();
  for (const rawM of raw.movies) {
    if (!rawM || !rawM.id) continue;
    movieMap.set(rawM.id, movieDesdeApi(rawM));
  }

  const peliculaPara = (movieId: string): CinepolisMovie => {
    const existente = movieMap.get(movieId);
    if (existente) return existente;
    registrar(
      "pelicula_fuera_de_cartelera",
      "aviso",
      `La película ${movieId} aparece en horarios pero no en la cartelera; se usan datos mínimos.`,
      { movieId },
    );
    const minima = peliculaMinima(movieId);
    movieMap.set(movieId, minima);
    return minima;
  };

  const cines: ScrapedCinema[] = [];
  const peliculas: ScrapedMovie[] = [];
  const horarios: ScrapedSchedule[] = [];
  const usedMovieIds = new Set<string>();
  const vistos = new Set<string>();
  let sesionesLeidas = 0;
  let cinesConRespuesta = 0;

  for (const cinema of selected) {
    try {
      cines.push(normalizeCinema(cinema, startedAt));
    } catch (err) {
      registrar("cine_descartado", "error", mensajeError(err), { cineId: cinema.id });
      continue;
    }

    const bb = raw.billboards[cinema.id];
    if (!bb || bb.estado === "error") {
      registrar("cine_error_api", "error", `No se pudo obtener la cartelera de ${cinema.name}.`, {
        cineId: cinema.id,
        intentos: bb?.intentos ?? [],
      });
      continue;
    }
    cinesConRespuesta++;

    if (bb.estado === "vacio" || bb.schedules.length === 0) {
      registrar("cine_sin_funciones", "info", `${cinema.name} no tiene funciones en la consulta.`, {
        cineId: cinema.id,
      });
      continue;
    }

    for (const sched of bb.schedules) {
      const movie = peliculaPara(sched.movieId);

      for (const dia of sched.dates ?? []) {
        const fecha = txt(dia.date) ?? "";
        if (!FECHA_RE.test(fecha)) {
          registrar("fecha_invalida", "aviso", `Fecha no reconocida: ${dia.date}`, {
            cineId: cinema.id,
            movieId: movie.id,
          });
          continue;
        }
        if (fecha < options.desde) continue;
        if (maxDate && fecha > maxDate) continue;

        for (const idioma of dia.languages ?? []) {
          const lang = idiomaDesde(idioma);

          for (const st of idioma.showtimes ?? []) {
            sesionesLeidas++;
            const sessionId = txt(st.sessionId);
            const hora = horaLocal(txt(st.datetime));
            if (!sessionId || !hora) {
              registrar("sesion_invalida", "aviso", "Función sin id u hora válida.", {
                cineId: cinema.id,
                movieId: movie.id,
                fecha,
                datetime: st.datetime ?? null,
              });
              continue;
            }

            const clave = `${cinema.id}:${sessionId}`;
            if (vistos.has(clave)) continue;
            vistos.add(clave);

            const numeroSala = txt(st.screen)?.replace(/^SALA\s*/i, "") ?? null;
            const formato = resolveCinepolisFormat({
              formatName: txt(st.format?.name),
              experienceName: txt(st.experience?.name),
              screen: numeroSala,
              cinemaId: cinema.id,
              movieSlugOrTitle: `${movie.slug} ${movie.title}`,
            });
            const disponibilidad = txt(st.availability);

            const sesion: CinepolisShowtime = {
              sessionId,
              cinemaId: cinema.id,
              movieId: movie.id,
              date: fecha,
              datetime: txt(st.datetime),
              time: hora,
              projection: formato.proyeccion,
              experience: formato.experiencia,
              formatSource: formato.fuente,
              format: formato.resumen,
              language: lang.normalizado,
              rawLanguage: lang.raw,
              rawFormat: txt(st.format?.name),
              rawExperience: txt(st.experience?.name),
              screen: numeroSala ? `SALA ${numeroSala}` : "",
              screenNumber: numeroSala,
              availability: disponibilidad,
              agotada: disponibilidad !== null && AGOTADA_RE.test(disponibilidad),
              vistaCinemaId: txt(st.cinemaVistaId) ?? cinema.vistaId,
              vistaMovieId: txt(st.movieVistaId),
              purchaseUrl: `${SITE}/horarios?movie=${encodeURIComponent(movie.slug)}&cinema=${encodeURIComponent(cinema.slug)}`,
            };

            try {
              horarios.push(normalizeSchedule(sesion, movie, cinema, startedAt));
              usedMovieIds.add(movie.id);
            } catch (err) {
              registrar("sesion_descartada", "error", mensajeError(err), { sessionId, cineId: cinema.id });
            }
          }
        }
      }
    }
  }

  for (const movieId of usedMovieIds) {
    const movie = movieMap.get(movieId);
    if (!movie) continue;
    if (movie.datosIncompletos) {
      registrar("pelicula_datos_incompletos", "aviso", `Datos incompletos para "${movie.title}".`, { movieId });
    }
    try {
      peliculas.push(normalizeMovie(movie, startedAt));
    } catch (err) {
      registrar("pelicula_descartada", "error", mensajeError(err), { movieId });
    }
  }

  if (DEBUG) {
    console.error(
      `[cinepolis] cines con respuesta: ${cinesConRespuesta}/${selected.length} · ` +
        `funciones: ${horarios.length} · películas: ${peliculas.length} · incidencias: ${incidencias.length}`,
    );
  }

  const resultado: ScrapeResult = {
    peliculas,
    cines,
    funciones: [],
    horarios,
    incidencias,
    meta: {
      origen: "cinepolis",
      version: 1,
      modo: "cartelera",
      iniciadoEn: startedAt,
      terminadoEn: localNow(),
      completo: errores === 0,
      desde: options.desde,
      dias: options.dias,
      limitePorCine: options.limitePorCine,
      cinesDisponibles: allCinemas.length,
      cinesSeleccionados: selected.length,
      cinesProcesados: cinesConRespuesta,
      sesionesConsultadas: sesionesLeidas,
      moneda: "CLP",
      zonaHoraria: ZONA,
      precioIncluyeServicio: false,
    },
  };

  return resultado;
}
