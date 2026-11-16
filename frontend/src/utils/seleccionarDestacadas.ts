import type { Pelicula } from "../types/types.ts";

export const LIMITE_DESTACADAS = 6;

export type CategoriaDestacada =
  | "favoritas"
  | "estrenos_recientes"
  | "mejor_valoradas"
  | "en_mas_salas"
  | "preventas_esperadas"
  | "reestrenos"
  | "destacada";

export type EstrategiaSeleccion = "top" | "aleatoria";

export interface ReglaCupoCategoria {
  categoria: Exclude<CategoriaDestacada, "destacada">;
  min: number;
  max: number;
  pesoVariable: number;
  estrategia: EstrategiaSeleccion;
  topAleatorio?: number;
}

export interface PeliculaDestacadaSeleccionada {
  pelicula: Pelicula;
  categoria: CategoriaDestacada;
  etiqueta: string;
  rangoCategoria?: number;
}

export interface OpcionesSeleccionDestacadas {
  limite?: number;
  hoy?: string;
  rng?: () => number;
  reglas?: readonly ReglaCupoCategoria[];
  mezclarOrden?: boolean;
}

export const CONFIG_CUPOS_DESTACADAS: readonly ReglaCupoCategoria[] = [
  {
    categoria: "favoritas",
    min: 0,
    max: 2,
    pesoVariable: 1.6,
    estrategia: "top",
  },
  {
    categoria: "estrenos_recientes",
    min: 1,
    max: 1,
    pesoVariable: 0,
    estrategia: "aleatoria",
    topAleatorio: 6,
  },
  {
    categoria: "preventas_esperadas",
    min: 1,
    max: 2,
    pesoVariable: 1.2,
    estrategia: "aleatoria",
    topAleatorio: 3,
  },
  {
    categoria: "mejor_valoradas",
    min: 0,
    max: 2,
    pesoVariable: 2.0,
    estrategia: "aleatoria",
    topAleatorio: 5,
  },
  {
    categoria: "en_mas_salas",
    min: 0,
    max: 2,
    pesoVariable: 1.8,
    estrategia: "aleatoria",
    topAleatorio: 5,
  },
  {
    categoria: "reestrenos",
    min: 0,
    max: 1,
    pesoVariable: 0.9,
    estrategia: "aleatoria",
    topAleatorio: 6,
  },
];

const MS_POR_DIA = 86_400_000;
const DIAS_ESTRENO_RECIENTE = 14;
const DIAS_MAX_ESTRENO_ORIGINAL_PARA_NOVEDAD = 540;
const DIAS_MIN_REESTRENO = 730;
const MIN_FAVORITOS_PARA_DESTACAR = 1;
const CINES_MIN_EN_MAS_SALAS = 15;
const VOTOS_MIN_MEJOR_VALORADA = 100;
const RATING_MIN_MEJOR_VALORADA = 7.2;
const PRIOR_VOTOS_BAYESIANO = 200;
const PRIOR_RATING_BAYESIANO = 7.2;

const CATEGORIAS_PRIMER_SLIDE = new Set<CategoriaDestacada>([
  "favoritas",
  "preventas_esperadas",
  "mejor_valoradas",
  "estrenos_recientes",
  "en_mas_salas",
]);

export function totalFavoritos(pelicula: Pelicula): number | undefined {
  const total = pelicula.totalFavoritos;
  return typeof total === "number" && Number.isSafeInteger(total) && total >= 0
    ? total
    : undefined;
}

export function tieneBannerHero(pelicula: Pelicula): boolean {
  return Boolean(pelicula.banner && pelicula.banner !== pelicula.poster);
}

export function fechaHoySantiago(): string {
  try {
    const formatted = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Santiago",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    if (/^\d{4}-\d{2}-\d{2}$/.test(formatted)) {
      return formatted;
    }
  } catch {
    // Fallback al reloj local si Intl no soporta la zona horaria
  }
  const ahora = new Date();
  const y = ahora.getFullYear();
  const m = String(ahora.getMonth() + 1).padStart(2, "0");
  const d = String(ahora.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parsearFechaUtcMs(fecha?: string): number | null {
  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null;
  const [y, m, d] = fecha.split("-").map(Number);
  if (!y || !m || !d) return null;
  const ms = Date.UTC(y, m - 1, d);
  const check = new Date(ms);
  if (
    check.getUTCFullYear() !== y ||
    check.getUTCMonth() !== m - 1 ||
    check.getUTCDate() !== d
  ) {
    return null;
  }
  return ms;
}

function diasDesde(fecha: string | undefined, hoy: string): number | null {
  const desdeMs = parsearFechaUtcMs(fecha);
  const hoyMs = parsearFechaUtcMs(hoy);
  if (desdeMs === null || hoyMs === null) return null;
  return Math.round((hoyMs - desdeMs) / MS_POR_DIA);
}

function esReestreno(pelicula: Pelicula, hoy: string): boolean {
  const antiguedadOriginal = diasDesde(pelicula.fechaEstrenoTmdb, hoy);
  return antiguedadOriginal !== null && antiguedadOriginal > DIAS_MIN_REESTRENO;
}

function esCartelera(pelicula: Pelicula): boolean {
  return pelicula.estadoEstreno !== "preventa";
}

function compararBase(a: Pelicula, b: Pelicula): number {
  return (
    (b.fechaEstreno ?? "").localeCompare(a.fechaEstreno ?? "") ||
    a.titulo.localeCompare(b.titulo, "es-CL") ||
    a.id.localeCompare(b.id)
  );
}

function compararPresencia(a: Pelicula, b: Pelicula): number {
  return (
    (b.totalCines ?? 0) - (a.totalCines ?? 0) ||
    (b.totalFunciones ?? 0) - (a.totalFunciones ?? 0) ||
    (b.popularidadTmdb ?? 0) - (a.popularidadTmdb ?? 0)
  );
}

function puntajeBayesiano(pelicula: Pelicula): number {
  const rating = pelicula.calificacionTmdb ?? 0;
  const votos = pelicula.votosTmdb ?? 0;
  return (
    (votos / (votos + PRIOR_VOTOS_BAYESIANO)) * rating +
    (PRIOR_VOTOS_BAYESIANO / (votos + PRIOR_VOTOS_BAYESIANO)) *
      PRIOR_RATING_BAYESIANO
  );
}

function puntajeReestreno(pelicula: Pelicula): number {
  const votos = pelicula.votosTmdb ?? 0;
  const rating = pelicula.calificacionTmdb ?? 6;
  return votos > 0 ? Math.log10(votos + 1) * rating : 0;
}

function puntajePreventa(pelicula: Pelicula): number {
  return (
    (totalFavoritos(pelicula) ?? 0) * 100 +
    (pelicula.popularidadTmdb ?? 0) +
    (pelicula.totalCines ?? 0) * 0.5
  );
}

function formatearFechaPreventa(fecha?: string): string {
  const ms = parsearFechaUtcMs(fecha);
  if (ms === null) return "Preventa destacada";
  const textoFecha = new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(ms));
  return `Estreno: ${textoFecha}`;
}

type CategoriaPoolId = Exclude<CategoriaDestacada, "destacada">;

function poolFavoritas(peliculas: readonly Pelicula[]): {
  candidatas: Pelicula[];
  empateEnTope: boolean;
} {
  const candidatas = peliculas
    .filter(
      (p) =>
        esCartelera(p) &&
        (totalFavoritos(p) ?? 0) >= MIN_FAVORITOS_PARA_DESTACAR,
    )
    .sort(
      (a, b) =>
        (totalFavoritos(b) ?? 0) - (totalFavoritos(a) ?? 0) ||
        Number(tieneBannerHero(b)) - Number(tieneBannerHero(a)) ||
        compararPresencia(a, b) ||
        compararBase(a, b),
    );

  if (candidatas.length === 0) {
    return { candidatas: [], empateEnTope: false };
  }

  const maxFavs = totalFavoritos(candidatas[0]!) ?? 0;
  const enPrimerLugar = candidatas.filter(
    (p) => (totalFavoritos(p) ?? 0) === maxFavs,
  );
  if (enPrimerLugar.length > 1) {
    return { candidatas: enPrimerLugar, empateEnTope: true };
  }
  return { candidatas: [enPrimerLugar[0]!], empateEnTope: false };
}

function obtenerPoolCategoria(
  categoria: CategoriaPoolId,
  peliculas: readonly Pelicula[],
  hoy: string,
): Pelicula[] {
  switch (categoria) {
    case "favoritas":
      return poolFavoritas(peliculas).candidatas;

    case "estrenos_recientes":
      return peliculas
        .filter((p) => {
          if (!esCartelera(p) || !tieneBannerHero(p)) return false;
          const dias = diasDesde(p.fechaEstreno, hoy);
          if (dias === null || dias < 0 || dias > DIAS_ESTRENO_RECIENTE) {
            return false;
          }
          const diasOriginal = diasDesde(p.fechaEstrenoTmdb, hoy);
          if (
            diasOriginal !== null &&
            diasOriginal > DIAS_MAX_ESTRENO_ORIGINAL_PARA_NOVEDAD
          ) {
            return false;
          }
          if (p.totalCines !== undefined || p.popularidadTmdb !== undefined) {
            return (p.totalCines ?? 0) >= 5 || (p.popularidadTmdb ?? 0) >= 10;
          }
          return true;
        })
        .sort((a, b) => compararPresencia(a, b) || compararBase(a, b));

    case "mejor_valoradas":
      return peliculas
        .filter(
          (p) =>
            esCartelera(p) &&
            tieneBannerHero(p) &&
            typeof p.calificacionTmdb === "number" &&
            p.calificacionTmdb >= RATING_MIN_MEJOR_VALORADA &&
            typeof p.votosTmdb === "number" &&
            p.votosTmdb >= VOTOS_MIN_MEJOR_VALORADA,
        )
        .sort(
          (a, b) =>
            puntajeBayesiano(b) - puntajeBayesiano(a) ||
            compararPresencia(a, b) ||
            compararBase(a, b),
        );

    case "en_mas_salas":
      return peliculas
        .filter(
          (p) =>
            esCartelera(p) &&
            tieneBannerHero(p) &&
            typeof p.totalCines === "number" &&
            p.totalCines >= CINES_MIN_EN_MAS_SALAS,
        )
        .sort((a, b) => compararPresencia(a, b) || compararBase(a, b));

    case "preventas_esperadas":
      return peliculas
        .filter(
          (p) =>
            p.estadoEstreno === "preventa" &&
            tieneBannerHero(p) &&
            ((totalFavoritos(p) ?? 0) > 0 ||
              (p.popularidadTmdb ?? 0) >= 10 ||
              (p.totalCines ?? 0) >= 25),
        )
        .sort(
          (a, b) =>
            puntajePreventa(b) - puntajePreventa(a) ||
            (a.fechaEstreno ?? "9999").localeCompare(b.fechaEstreno ?? "9999") ||
            compararBase(a, b),
        );

    case "reestrenos":
      return peliculas
        .filter((p) => esCartelera(p) && tieneBannerHero(p) && esReestreno(p, hoy))
        .sort(
          (a, b) =>
            puntajeReestreno(b) - puntajeReestreno(a) ||
            compararPresencia(a, b) ||
            compararBase(a, b),
        );
  }
}

function generarEtiqueta(
  categoria: CategoriaDestacada,
  pelicula: Pelicula,
  empateFavoritas = false,
): string {
  switch (categoria) {
    case "favoritas":
      return empateFavoritas ? "Top favoritos" : "N° 1 en favoritos";
    case "estrenos_recientes":
      return "Estreno reciente";
    case "mejor_valoradas":
      return typeof pelicula.calificacionTmdb === "number"
        ? `Mejor valorada ★ ${pelicula.calificacionTmdb.toFixed(1)}`
        : "Mejor valorada";
    case "en_mas_salas":
      return "Tendencia en cines";
    case "preventas_esperadas":
      return formatearFechaPreventa(pelicula.fechaEstreno);
    case "reestrenos":
      return pelicula.fechaEstrenoTmdb
        ? `Reestreno · ${pelicula.fechaEstrenoTmdb.slice(0, 4)}`
        : "Reestreno especial";
    case "destacada":
      return pelicula.estadoEstreno === "preventa"
        ? formatearFechaPreventa(pelicula.fechaEstreno)
        : "Destacada de la semana";
  }
}

function rollSeguro(rng: () => number): number {
  const valor = rng();
  if (!Number.isFinite(valor) || valor <= 0) return 0;
  if (valor >= 1) return 1 - Number.EPSILON;
  return valor;
}

function elegirPonderada<T extends { pesoVariable: number }>(
  opciones: readonly T[],
  rng: () => number,
): T {
  const pesoTotal = opciones.reduce(
    (acc, item) => acc + Math.max(0, item.pesoVariable),
    0,
  );
  if (pesoTotal <= 0) {
    return opciones[Math.floor(rollSeguro(rng) * opciones.length)]!;
  }
  let umbral = rollSeguro(rng) * pesoTotal;
  for (const opcion of opciones) {
    umbral -= Math.max(0, opcion.pesoVariable);
    if (umbral < 0) return opcion;
  }
  return opciones[opciones.length - 1]!;
}

function elegirCandidata(
  disponibles: readonly Pelicula[],
  regla: ReglaCupoCategoria,
  rng: () => number,
): Pelicula {
  if (regla.estrategia === "top" || disponibles.length === 1) {
    return disponibles[0]!;
  }
  const tope =
    regla.topAleatorio && regla.topAleatorio > 0
      ? Math.min(regla.topAleatorio, disponibles.length)
      : disponibles.length;
  const indice = Math.floor(rollSeguro(rng) * tope);
  return disponibles[indice]!;
}

function mezclarCarrusel(
  items: readonly PeliculaDestacadaSeleccionada[],
  rng: () => number,
): PeliculaDestacadaSeleccionada[] {
  const resultado = [...items];
  for (let i = resultado.length - 1; i > 0; i--) {
    const j = Math.floor(rollSeguro(rng) * (i + 1));
    const tmp = resultado[i]!;
    resultado[i] = resultado[j]!;
    resultado[j] = tmp;
  }

  // Reservamos el primer slide para favoritas, mas esperadas, mejor valoradas o tendencia en cines.
  if (
    resultado.length > 1 &&
    !CATEGORIAS_PRIMER_SLIDE.has(resultado[0]!.categoria)
  ) {
    const idxPrioritaria = resultado.findIndex((item) =>
      CATEGORIAS_PRIMER_SLIDE.has(item.categoria),
    );
    if (idxPrioritaria > 0) {
      const primera = resultado[0]!;
      resultado[0] = resultado[idxPrioritaria]!;
      resultado[idxPrioritaria] = primera;
    }
  }

  return resultado;
}

export function seleccionarDestacadasConCategoria(
  peliculas: readonly Pelicula[],
  opciones: OpcionesSeleccionDestacadas = {},
): PeliculaDestacadaSeleccionada[] {
  const limite = opciones.limite ?? LIMITE_DESTACADAS;
  if (!Number.isSafeInteger(limite) || limite <= 0) return [];

  const hoy = opciones.hoy ?? fechaHoySantiago();
  const rng = opciones.rng ?? Math.random;
  const reglas = opciones.reglas ?? CONFIG_CUPOS_DESTACADAS;
  const mezclarOrden = opciones.mezclarOrden ?? true;

  const unicas = new Map(
    peliculas
      .filter((pelicula) => pelicula.estadoEstreno !== "proximamente")
      .map((pelicula) => [pelicula.id, pelicula]),
  );
  const catalogo = [...unicas.values()];
  if (catalogo.length === 0) return [];

  const infoFavoritas = poolFavoritas(catalogo);
  const pools = new Map<CategoriaPoolId, Pelicula[]>(
    reglas.map((regla) => [
      regla.categoria,
      regla.categoria === "favoritas"
        ? infoFavoritas.candidatas
        : obtenerPoolCategoria(regla.categoria, catalogo, hoy),
    ]),
  );

  const usadas = new Set<string>();
  const conteos = new Map<CategoriaPoolId, number>(
    reglas.map((regla) => [regla.categoria, 0]),
  );
  const seleccionadas: PeliculaDestacadaSeleccionada[] = [];

  const agregarDeRegla = (regla: ReglaCupoCategoria): boolean => {
    const pool = pools.get(regla.categoria) ?? [];
    const disponibles = pool.filter((p) => !usadas.has(p.id));
    if (disponibles.length === 0) return false;

    const reglaEfectiva: ReglaCupoCategoria =
      regla.categoria === "favoritas" && infoFavoritas.empateEnTope
        ? { ...regla, estrategia: "aleatoria", topAleatorio: pool.length }
        : regla;

    const elegida = elegirCandidata(disponibles, reglaEfectiva, rng);
    const rangoCategoria = pool.findIndex((p) => p.id === elegida.id) + 1;

    usadas.add(elegida.id);
    conteos.set(regla.categoria, (conteos.get(regla.categoria) ?? 0) + 1);
    seleccionadas.push({
      pelicula: elegida,
      categoria: regla.categoria,
      etiqueta: generarEtiqueta(
        regla.categoria,
        elegida,
        regla.categoria === "favoritas" ? infoFavoritas.empateEnTope : false,
      ),
      rangoCategoria,
    });
    return true;
  };

  // Fase 1: Puestos fijos (en el orden definido para preservar prioridad de top)
  for (const regla of reglas) {
    while (
      seleccionadas.length < limite &&
      (conteos.get(regla.categoria) ?? 0) < Math.min(regla.min, regla.max)
    ) {
      if (!agregarDeRegla(regla)) break;
    }
  }

  // Fase 2: Puestos variables ponderados entre categorías elegibles con cupo libre
  while (seleccionadas.length < limite) {
    const elegibles = reglas.filter((regla) => {
      const asignados = conteos.get(regla.categoria) ?? 0;
      if (asignados >= regla.max) return false;
      const pool = pools.get(regla.categoria) ?? [];
      return pool.some((p) => !usadas.has(p.id));
    });

    if (elegibles.length === 0) break;

    const reglaElegida = elegirPonderada(elegibles, rng);
    agregarDeRegla(reglaElegida);
  }

  // Fase 3: Respaldo general para completar limite sin repetir
  if (seleccionadas.length < limite) {
    const respaldo = catalogo
      .filter((p) => !usadas.has(p.id))
      .sort(
        (a, b) =>
          Number(a.estadoEstreno === "preventa") -
            Number(b.estadoEstreno === "preventa") ||
          Number(tieneBannerHero(b)) - Number(tieneBannerHero(a)) ||
          compararPresencia(a, b) ||
          compararBase(a, b),
      );

    for (const pelicula of respaldo) {
      if (seleccionadas.length >= limite) break;
      usadas.add(pelicula.id);
      seleccionadas.push({
        pelicula,
        categoria: "destacada",
        etiqueta: generarEtiqueta("destacada", pelicula),
      });
    }
  }

  return mezclarOrden ? mezclarCarrusel(seleccionadas, rng) : seleccionadas;
}

export function seleccionarDestacadas(
  peliculas: readonly Pelicula[],
  limite = LIMITE_DESTACADAS,
): Pelicula[] {
  return seleccionarDestacadasConCategoria(peliculas, { limite }).map(
    (item) => item.pelicula,
  );
}
