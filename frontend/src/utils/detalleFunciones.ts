import type { Horario } from "../types/types.ts";

export const COOLDOWN_DETALLE_MS = 5 * 60_000;
export const EXPIRACION_DETALLE_MS = 60 * 60_000;

export type DetalleHorario = Partial<
  Pick<
    Horario,
    | "tarifas"
    | "estadoPrecio"
    | "preciosConsultadosEn"
    | "reintentarEn"
    | "urlCompra"
    | "butacas"
    | "estadoButacas"
    | "butacasReintentarEn"
    | "agotada"
  >
>;

export interface RegistroConsulta {
  consultadoEn: number;
  falloPrecios: boolean;
  falloButacas: boolean;
}

export interface EstadoDetalleGrupo {
  cargando: boolean;
  revelado: boolean;
  enCooldown: boolean;
  consultadoEn: number | null;
  avisoError: string | null;
}

export const claveDetalle = (peliculaId: string, cineId: string, fecha: string) =>
  `${peliculaId}:${cineId}:${fecha}`;

export function parsearTimestamp(iso?: string): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

/** Formatea la antiguedad relativa (< 60 min) segun las reglas de la cabecera. */
export function formatearTiempoRelativo(consultadoEn: number, ahora: number): string {
  const minutos = Math.max(0, Math.floor((ahora - consultadoEn) / 60_000));
  if (minutos < 1) return "Actualizado hace un momento";
  if (minutos === 1) return "Actualizado hace 1 minuto";
  return `Actualizado hace ${minutos} minutos`;
}

/**
 * Evalua si el grupo ya posee detalle completo con menos de 5 minutos en memoria/backend
 * para evitar re-scraping al pulsar "Consultar detalle".
 */
export function obtenerCacheMenorACincoMinutos(horarios: Horario[], ahora: number): number | null {
  if (!horarios.length) return null;
  const timestamps: number[] = [];

  for (const h of horarios) {
    if (h.estadoPrecio === "error" || h.estadoButacas === "error") return null;

    const pTs = parsearTimestamp(h.preciosConsultadosEn);
    const bTs = parsearTimestamp(h.butacas?.consultadasEn);

    if (h.agotada) {
      if (pTs !== null) {
        if (ahora - pTs >= COOLDOWN_DETALLE_MS) return null;
        timestamps.push(pTs);
      }
      if (bTs !== null) {
        if (ahora - bTs >= COOLDOWN_DETALLE_MS) return null;
        timestamps.push(bTs);
      }
      continue;
    }

    if (
      pTs === null ||
      ahora - pTs >= COOLDOWN_DETALLE_MS ||
      h.estadoPrecio === "pendiente" ||
      h.estadoPrecio === "consultando"
    ) {
      return null;
    }
    timestamps.push(pTs);

    if (bTs !== null) {
      if (ahora - bTs >= COOLDOWN_DETALLE_MS) return null;
      timestamps.push(bTs);
    } else if (h.estadoButacas !== "sin_datos") {
      return null;
    }
  }

  if (!timestamps.length) return null;
  // Evita tiempos negativos si el reloj del servidor adelanta unos segundos al navegador.
  const masAntiguo = Math.min(...timestamps, ahora);
  return ahora - masAntiguo < COOLDOWN_DETALLE_MS ? masAntiguo : null;
}

/** Descarta tarifas o butacas con error o con >= 60 minutos de antiguedad. */
export function sanitizarDetalleHorario(
  h: Horario,
  ahora: number,
  opciones?: { falloPrecios?: boolean; falloButacas?: boolean },
): DetalleHorario {
  const pTs = parsearTimestamp(h.preciosConsultadosEn);
  const precioExpirado = pTs !== null && ahora - pTs >= EXPIRACION_DETALLE_MS;
  const precioInvalido =
    Boolean(opciones?.falloPrecios) ||
    h.estadoPrecio === "error" ||
    h.estadoPrecio === "pendiente" ||
    h.estadoPrecio === "consultando" ||
    precioExpirado;

  const bTs = parsearTimestamp(h.butacas?.consultadasEn);
  const butacasExpiradas = bTs !== null && ahora - bTs >= EXPIRACION_DETALLE_MS;
  const butacasInvalidas =
    Boolean(opciones?.falloButacas) ||
    h.estadoButacas === "error" ||
    h.estadoButacas === "pendiente" ||
    butacasExpiradas;

  // No heredar agotada si las butacas expiraron o fallaron y tampoco hay estado agotado vigente en precio.
  const agotada = butacasInvalidas
    ? h.estadoPrecio === "agotada" && !precioInvalido
    : Boolean(h.agotada);

  return {
    tarifas: precioInvalido ? [] : h.tarifas,
    estadoPrecio: precioInvalido
      ? h.estadoPrecio === "error" || opciones?.falloPrecios
        ? "error"
        : "pendiente"
      : h.estadoPrecio,
    preciosConsultadosEn: precioInvalido ? undefined : h.preciosConsultadosEn,
    reintentarEn: h.reintentarEn,
    urlCompra: h.urlCompra,
    butacas: butacasInvalidas ? undefined : h.butacas,
    estadoButacas: butacasInvalidas
      ? h.estadoButacas === "error" || opciones?.falloButacas
        ? "error"
        : "pendiente"
      : h.estadoButacas,
    butacasReintentarEn: h.butacasReintentarEn,
    agotada,
  };
}

export function tieneAlgunaVigenciaMenorASesentaMin(horarios: Horario[], ahora: number): boolean {
  return horarios.some((h) => {
    const pTs = parsearTimestamp(h.preciosConsultadosEn);
    const bTs = parsearTimestamp(h.butacas?.consultadasEn);
    const precioVigente =
      (pTs !== null && ahora - pTs < EXPIRACION_DETALLE_MS) ||
      h.estadoPrecio === "agotada";
    const butacasVigentes =
      (bTs !== null && ahora - bTs < EXPIRACION_DETALLE_MS) ||
      h.estadoButacas === "sin_datos";
    return precioVigente || butacasVigentes;
  });
}

/** Calcula los flags de UI (cooldown, expiracion >= 60 min, texto relativo y fallo) para una cabecera. */
export function resolverEstadoGrupo(
  consulta: RegistroConsulta | undefined,
  cargando: boolean,
  ahora: number,
): EstadoDetalleGrupo {
  const revelado =
    Boolean(consulta) && ahora - (consulta?.consultadoEn ?? 0) < EXPIRACION_DETALLE_MS;
  const enCooldown =
    revelado && Boolean(consulta) && ahora - (consulta?.consultadoEn ?? 0) < COOLDOWN_DETALLE_MS;

  let avisoError: string | null = null;
  if (revelado && consulta) {
    if (consulta.falloPrecios && consulta.falloButacas) {
      avisoError = "Datos no disponibles";
    } else if (consulta.falloPrecios) {
      avisoError = "Precio no disponible";
    } else if (consulta.falloButacas) {
      avisoError = "Butacas no disponibles";
    }
  }

  return {
    cargando,
    revelado,
    enCooldown,
    consultadoEn: revelado && consulta ? consulta.consultadoEn : null,
    avisoError,
  };
}

/** Devuelve el horario oculto (solo 2 lineas) si no esta revelado o si ya expiro (>= 60 min). */
export function prepararHorarioParaTarjeta(
  horario: Horario,
  detalle: DetalleHorario | undefined,
  revelado: boolean,
  ahora: number,
): Horario {
  if (!revelado) {
    return {
      ...horario,
      tarifas: [],
      butacas: undefined,
      agotada: false,
      estadoPrecio: "pendiente",
      estadoButacas: "pendiente",
    };
  }

  const fusionado = { ...horario, ...detalle };
  return {
    ...fusionado,
    ...sanitizarDetalleHorario(fusionado, ahora),
  };
}
