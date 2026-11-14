import { useCallback, useEffect, useRef, useState } from "react";
import funcionesService from "../services/funciones";
import type { Horario } from "../types/types";
import {
  COOLDOWN_DETALLE_MS,
  EXPIRACION_DETALLE_MS,
  claveDetalle,
  obtenerCacheMenorACincoMinutos,
  prepararHorarioParaTarjeta,
  resolverEstadoGrupo,
  sanitizarDetalleHorario,
  tieneAlgunaVigenciaMenorASesentaMin,
  type DetalleHorario,
  type EstadoDetalleGrupo,
  type RegistroConsulta,
} from "../utils/detalleFunciones";

const DELAY_CACHE_VISUAL_MS = 200;
const INTERVALO_RELOJ_MS = 30_000;

export { claveDetalle, type DetalleHorario, type EstadoDetalleGrupo };

function esperaAbortable(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Coordina cache (< 5 min), consultas paralelas de precios y butacas,
 * cooldown de 5 min y expiracion automatica a los 60 min.
 */
export function useDetalleFunciones() {
  const [porHorario, setPorHorario] = useState<Record<string, DetalleHorario>>({});
  const [cargando, setCargando] = useState<Record<string, boolean>>({});
  const [consultas, setConsultas] = useState<Record<string, RegistroConsulta>>({});
  const [ahora, setAhora] = useState(() => Date.now());
  const pendientes = useRef(new Map<string, AbortController>());
  const porHorarioRef = useRef(porHorario);

  useEffect(() => {
    porHorarioRef.current = porHorario;
  }, [porHorario]);

  useEffect(() => {
    const activas = pendientes.current;
    return () => {
      for (const controller of activas.values()) controller.abort();
      activas.clear();
    };
  }, []);

  // Mantiene actualizado el tiempo relativo y dispara transiciones exactas de 5 min y 60 min.
  useEffect(() => {
    const vigentes = Object.values(consultas).filter(
      (c) => ahora - c.consultadoEn < EXPIRACION_DETALLE_MS,
    );
    if (!vigentes.length) return;

    const intervalo = setInterval(() => setAhora(Date.now()), INTERVALO_RELOJ_MS);

    let proximoHitoMs = Infinity;
    for (const c of vigentes) {
      const transcurrido = Math.max(0, ahora - c.consultadoEn);
      const siguienteMinuto = (Math.floor(transcurrido / 60_000) + 1) * 60_000 - transcurrido;
      const hastaCooldown = COOLDOWN_DETALLE_MS - transcurrido;
      const hastaExpiracion = EXPIRACION_DETALLE_MS - transcurrido;

      proximoHitoMs = Math.min(proximoHitoMs, siguienteMinuto);
      if (hastaCooldown > 0) proximoHitoMs = Math.min(proximoHitoMs, hastaCooldown);
      if (hastaExpiracion > 0) proximoHitoMs = Math.min(proximoHitoMs, hastaExpiracion);
    }

    const timeout = Number.isFinite(proximoHitoMs)
      ? setTimeout(() => setAhora(Date.now()), Math.max(50, proximoHitoMs + 25))
      : undefined;

    return () => {
      clearInterval(intervalo);
      if (timeout !== undefined) clearTimeout(timeout);
    };
  }, [consultas, ahora]);

  const consultar = useCallback(
    async (peliculaId: string, cineId: string, fecha: string, horariosGrupo: Horario[] = []) => {
      if (!peliculaId || !cineId || !fecha) return;
      const clave = claveDetalle(peliculaId, cineId, fecha);
      if (pendientes.current.has(clave)) return;

      const controller = new AbortController();
      pendientes.current.set(clave, controller);
      setCargando((prev) => ({ ...prev, [clave]: true }));

      try {
        const instanteClick = Date.now();
        const detalleActual = porHorarioRef.current;
        const fusionados = horariosGrupo.map((h) => ({ ...h, ...detalleActual[h.id] }));
        const cacheTimestamp = obtenerCacheMenorACincoMinutos(fusionados, instanteClick);

        if (cacheTimestamp !== null) {
          await esperaAbortable(DELAY_CACHE_VISUAL_MS, controller.signal);
          if (controller.signal.aborted) return;

          const actual = Date.now();
          const actualizaciones: Record<string, DetalleHorario> = {};
          for (const h of fusionados) {
            actualizaciones[h.id] = sanitizarDetalleHorario(h, actual);
          }
          setPorHorario((prev) => ({ ...prev, ...actualizaciones }));
          setConsultas((prev) => ({
            ...prev,
            [clave]: {
              consultadoEn: cacheTimestamp,
              falloPrecios: false,
              falloButacas: false,
            },
          }));
          setAhora(actual);
          return;
        }

        const [resPrecios, resButacas] = await Promise.allSettled([
          funcionesService.getPrecios(peliculaId, cineId, fecha, controller.signal),
          funcionesService.getButacas(peliculaId, cineId, fecha, controller.signal),
        ]);
        if (controller.signal.aborted) return;

        const actual = Date.now();
        const falloEndpointPrecios = resPrecios.status === "rejected";
        const falloEndpointButacas = resButacas.status === "rejected";
        const listaPrecios = resPrecios.status === "fulfilled" ? resPrecios.value : [];
        const listaButacas = resButacas.status === "fulfilled" ? resButacas.value : [];

        const falloPrecios =
          falloEndpointPrecios || listaPrecios.some((h) => h.estadoPrecio === "error");
        const falloButacas =
          falloEndpointButacas || listaButacas.some((h) => h.estadoButacas === "error");

        const preciosPorId = new Map(listaPrecios.map((h) => [h.id, h]));
        const butacasPorId = new Map(listaButacas.map((h) => [h.id, h]));
        const idsAfectados = new Set<string>([
          ...horariosGrupo.map((h) => h.id),
          ...preciosPorId.keys(),
          ...butacasPorId.keys(),
        ]);
        const basePorId = new Map(horariosGrupo.map((h) => [h.id, h]));
        const actualizaciones: Record<string, DetalleHorario> = {};
        const combinadosParaValidar: Horario[] = [];

        for (const id of idsAfectados) {
          const hBase = basePorId.get(id);
          const hPrecio = preciosPorId.get(id);
          const hButaca = butacasPorId.get(id);
          const template = hPrecio ?? hButaca ?? hBase;
          if (!template) continue;

          const combinado: Horario = {
            ...template,
            ...(hBase ?? {}),
            ...(hPrecio
              ? {
                  tarifas: hPrecio.tarifas,
                  estadoPrecio: hPrecio.estadoPrecio,
                  preciosConsultadosEn: hPrecio.preciosConsultadosEn,
                  reintentarEn: hPrecio.reintentarEn,
                  urlCompra: hPrecio.urlCompra ?? hBase?.urlCompra,
                }
              : falloEndpointPrecios
                ? {
                    tarifas: [],
                    estadoPrecio: "error",
                    preciosConsultadosEn: undefined,
                  }
                : {}),
            ...(hButaca
              ? {
                  butacas: hButaca.butacas,
                  estadoButacas: hButaca.estadoButacas,
                  butacasReintentarEn: hButaca.butacasReintentarEn,
                }
              : falloEndpointButacas
                ? {
                    butacas: undefined,
                    estadoButacas: "error",
                  }
                : {}),
            agotada: Boolean(
              (hPrecio && !falloEndpointPrecios ? hPrecio.agotada : false) ||
                (hButaca && !falloEndpointButacas ? hButaca.agotada : false),
            ),
          };

          const sanitizado = sanitizarDetalleHorario(combinado, actual, {
            falloPrecios: falloEndpointPrecios || hPrecio?.estadoPrecio === "error",
            falloButacas: falloEndpointButacas || hButaca?.estadoButacas === "error",
          });
          actualizaciones[id] = sanitizado;
          combinadosParaValidar.push({ ...combinado, ...sanitizado });
        }

        setPorHorario((prev) => ({ ...prev, ...actualizaciones }));

        const hayDatoVigente = tieneAlgunaVigenciaMenorASesentaMin(combinadosParaValidar, actual);
        // Si no hubo error pero el backend solo devolvio datos >= 60 min, se ocultan y vuelve al estado inicial.
        if (!falloPrecios && !falloButacas && !hayDatoVigente && combinadosParaValidar.length > 0) {
          setConsultas((prev) => {
            const copy = { ...prev };
            delete copy[clave];
            return copy;
          });
        } else {
          setConsultas((prev) => ({
            ...prev,
            [clave]: {
              consultadoEn: actual,
              falloPrecios,
              falloButacas,
            },
          }));
        }
        setAhora(actual);
      } finally {
        if (pendientes.current.get(clave) === controller) pendientes.current.delete(clave);
        if (!controller.signal.aborted) {
          setCargando((prev) => ({ ...prev, [clave]: false }));
        }
      }
    },
    [],
  );

  const estadoGrupo = useCallback(
    (clave: string): EstadoDetalleGrupo =>
      resolverEstadoGrupo(consultas[clave], Boolean(cargando[clave]), ahora),
    [cargando, consultas, ahora],
  );

  const horarioParaTarjeta = useCallback(
    (horario: Horario, clave: string): Horario => {
      const { revelado } = resolverEstadoGrupo(consultas[clave], Boolean(cargando[clave]), ahora);
      return prepararHorarioParaTarjeta(horario, porHorario[horario.id], revelado, ahora);
    },
    [cargando, consultas, porHorario, ahora],
  );

  return {
    porHorario,
    cargando,
    ahora,
    estadoGrupo,
    horarioParaTarjeta,
    consultar,
  };
}
