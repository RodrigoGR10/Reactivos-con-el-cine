import { useCallback, useEffect, useRef, useState } from "react";
import funcionesService from "../services/funciones";
import type { Horario } from "../types/types";
import {
    COOLDOWN_DETALLE_MS,
    EXPIRACION_DETALLE_MS,
    claveDetalle,
    extraerDetalleParcial,
    obtenerCacheMenorACincoMinutos,
    parsearTimestamp,
    prepararHorarioParaTarjeta,
    resolverEstadoGrupo,
    sanitizarDetalleHorario,
    tieneAlgunaVigenciaMenorASesentaMin,
    type DetalleHorario,
    type EstadoDetalleGrupo,
    type ProgresoDetalle,
    type RegistroConsulta,
} from "../utils/detalleFunciones";

const DELAY_CACHE_VISUAL_MS = 200;

export {
    claveDetalle,
    type DetalleHorario,
    type EstadoDetalleGrupo,
    type ProgresoDetalle,
};

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
/**
 * Gestiona consultas de precios y butacas, su vigencia, progreso y cancelación.
 * @returns Detalles por horario y acciones para consultar o preparar tarjetas.
 */
export function useDetalleFunciones() {
    const [porHorario, setPorHorario] = useState<
        Record<string, DetalleHorario>
    >({});
    const [cargando, setCargando] = useState<Record<string, boolean>>({});
    const [progreso, setProgreso] = useState<Record<string, ProgresoDetalle>>(
        {},
    );
    const [consultas, setConsultas] = useState<
        Record<string, RegistroConsulta>
    >({});
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

    // Dispara solo las transiciones exactas de cooldown (5 min) y expiracion (60 min).
    useEffect(() => {
        const vigentes = Object.values(consultas).filter(
            (c) => ahora - c.consultadoEn < EXPIRACION_DETALLE_MS,
        );
        if (!vigentes.length) return;

        let proximoHitoTs = Infinity;
        for (const c of vigentes) {
            const cooldownTs = c.consultadoEn + COOLDOWN_DETALLE_MS;
            const expiracionTs = c.consultadoEn + EXPIRACION_DETALLE_MS;
            if (cooldownTs > ahora)
                proximoHitoTs = Math.min(proximoHitoTs, cooldownTs);
            if (expiracionTs > ahora)
                proximoHitoTs = Math.min(proximoHitoTs, expiracionTs);
        }

        for (const detalle of Object.values(porHorario)) {
            for (const iso of [
                detalle.preciosConsultadosEn,
                detalle.butacas?.consultadasEn,
            ]) {
                const ts = parsearTimestamp(iso);
                if (ts === null) continue;
                const expiracionTs = ts + EXPIRACION_DETALLE_MS;
                if (expiracionTs > ahora)
                    proximoHitoTs = Math.min(proximoHitoTs, expiracionTs);
            }
        }

        if (!Number.isFinite(proximoHitoTs)) return;

        const timeout = setTimeout(
            () => setAhora(Date.now()),
            Math.max(50, proximoHitoTs - Date.now() + 25),
        );
        const alCambiarVisibilidad = () => {
            if (
                document.visibilityState === "visible" &&
                Date.now() >= proximoHitoTs
            ) {
                setAhora(Date.now());
            }
        };
        document.addEventListener("visibilitychange", alCambiarVisibilidad);

        return () => {
            clearTimeout(timeout);
            document.removeEventListener(
                "visibilitychange",
                alCambiarVisibilidad,
            );
        };
    }, [consultas, porHorario, ahora]);

    const consultar = useCallback(
        async (
            peliculaId: string,
            cineId: string,
            fecha: string,
            horariosGrupo: Horario[] = [],
        ) => {
            if (!peliculaId || !cineId || !fecha) return;
            const clave = claveDetalle(peliculaId, cineId, fecha);
            if (pendientes.current.has(clave)) return;

            const controller = new AbortController();
            pendientes.current.set(clave, controller);
            setCargando((prev) => ({ ...prev, [clave]: true }));

            try {
                const instanteClick = Date.now();
                const detalleActual = porHorarioRef.current;
                const fusionados = horariosGrupo.map((h) => ({
                    ...h,
                    ...detalleActual[h.id],
                }));
                const cacheTimestamp = obtenerCacheMenorACincoMinutos(
                    fusionados,
                    instanteClick,
                );

                if (cacheTimestamp !== null) {
                    await esperaAbortable(
                        DELAY_CACHE_VISUAL_MS,
                        controller.signal,
                    );
                    if (controller.signal.aborted) return;

                    const actual = Date.now();
                    const actualizaciones: Record<string, DetalleHorario> = {};
                    for (const h of fusionados) {
                        actualizaciones[h.id] = sanitizarDetalleHorario(
                            h,
                            actual,
                        );
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

                const preciosPorId = new Map<string, Horario>();
                const butacasPorId = new Map<string, Horario>();
                let falloEndpointPrecios = false;
                let falloEndpointButacas = false;
                const totalInicial = horariosGrupo.length;
                // Limpia valores previos en memoria de este grupo para mostrar solo datos frescos del stream.
                if (horariosGrupo.length > 0) {
                    const idsGrupo = new Set(horariosGrupo.map((h) => h.id));
                    setPorHorario((prev) => {
                        let cambio = false;
                        const siguiente: Record<string, DetalleHorario> = {};
                        for (const [id, valor] of Object.entries(prev)) {
                            if (idsGrupo.has(id)) {
                                cambio = true;
                            } else {
                                siguiente[id] = valor;
                            }
                        }
                        return cambio ? siguiente : prev;
                    });
                }
                setProgreso((prev) => ({
                    ...prev,
                    [clave]: { porcentaje: 0 },
                }));

                const actualizarProgreso = () => {
                    const totalFunciones = Math.max(
                        totalInicial,
                        preciosPorId.size,
                        butacasPorId.size,
                    );
                    const totalPasos = totalFunciones * 2;
                    const porcentaje =
                        totalPasos > 0
                            ? Math.min(
                                  100,
                                  Math.round(
                                      ((preciosPorId.size + butacasPorId.size) /
                                          totalPasos) *
                                          100,
                                  ),
                              )
                            : 0;
                    setProgreso((prev) => {
                        if (prev[clave]?.porcentaje === porcentaje) return prev;
                        return { ...prev, [clave]: { porcentaje } };
                    });
                };

                try {
                    await funcionesService.streamDetalle(
                        peliculaId,
                        cineId,
                        fecha,
                        (evento) => {
                            if (controller.signal.aborted) return;
                            if (evento.tipo === "precio") {
                                preciosPorId.set(
                                    evento.horario.id,
                                    evento.horario,
                                );
                                const parcial = extraerDetalleParcial(
                                    [evento.horario],
                                    "precios",
                                )[evento.horario.id];
                                setPorHorario((prev) => ({
                                    ...prev,
                                    [evento.horario.id]: {
                                        ...prev[evento.horario.id],
                                        ...parcial,
                                    },
                                }));
                                actualizarProgreso();
                            } else if (evento.tipo === "butaca") {
                                butacasPorId.set(
                                    evento.horario.id,
                                    evento.horario,
                                );
                                const parcial = extraerDetalleParcial(
                                    [evento.horario],
                                    "butacas",
                                )[evento.horario.id];
                                setPorHorario((prev) => ({
                                    ...prev,
                                    [evento.horario.id]: {
                                        ...prev[evento.horario.id],
                                        ...parcial,
                                    },
                                }));
                                actualizarProgreso();
                            } else if (evento.tipo === "fin") {
                                falloEndpointPrecios = evento.falloPrecios;
                                falloEndpointButacas = evento.falloButacas;
                            }
                        },
                        controller.signal,
                    );
                } catch {
                    if (controller.signal.aborted) return;
                    falloEndpointPrecios =
                        falloEndpointPrecios || preciosPorId.size === 0;
                    falloEndpointButacas =
                        falloEndpointButacas || butacasPorId.size === 0;
                }
                if (controller.signal.aborted) return;

                const actual = Date.now();
                const listaPrecios = Array.from(preciosPorId.values());
                const listaButacas = Array.from(butacasPorId.values());

                const falloPrecios =
                    falloEndpointPrecios ||
                    listaPrecios.some((h) => h.estadoPrecio === "error");
                const falloButacas =
                    falloEndpointButacas ||
                    listaButacas.some((h) => h.estadoButacas === "error");

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
                                  preciosConsultadosEn:
                                      hPrecio.preciosConsultadosEn,
                                  reintentarEn: hPrecio.reintentarEn,
                                  urlCompra:
                                      hPrecio.urlCompra ?? hBase?.urlCompra,
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
                                  butacasReintentarEn:
                                      hButaca.butacasReintentarEn,
                              }
                            : falloEndpointButacas
                              ? {
                                    butacas: undefined,
                                    estadoButacas: "error",
                                }
                              : {}),
                        agotada: Boolean(
                            (hPrecio && !falloEndpointPrecios
                                ? hPrecio.agotada
                                : false) ||
                            (hButaca && !falloEndpointButacas
                                ? hButaca.agotada
                                : false),
                        ),
                    };

                    const sanitizado = sanitizarDetalleHorario(
                        combinado,
                        actual,
                        {
                            falloPrecios:
                                falloEndpointPrecios ||
                                hPrecio?.estadoPrecio === "error",
                            falloButacas:
                                falloEndpointButacas ||
                                hButaca?.estadoButacas === "error",
                        },
                    );
                    actualizaciones[id] = sanitizado;
                    combinadosParaValidar.push({ ...combinado, ...sanitizado });
                }

                setPorHorario((prev) => ({ ...prev, ...actualizaciones }));

                const hayDatoVigente = tieneAlgunaVigenciaMenorASesentaMin(
                    combinadosParaValidar,
                    actual,
                );
                // Si no hubo error pero el backend solo devolvio datos >= 60 min, se ocultan y vuelve al estado inicial.
                if (
                    !falloPrecios &&
                    !falloButacas &&
                    !hayDatoVigente &&
                    combinadosParaValidar.length > 0
                ) {
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
                if (pendientes.current.get(clave) === controller)
                    pendientes.current.delete(clave);
                if (!controller.signal.aborted) {
                    setCargando((prev) => ({ ...prev, [clave]: false }));
                    setProgreso((prev) => {
                        if (!(clave in prev)) return prev;
                        const copy = { ...prev };
                        delete copy[clave];
                        return copy;
                    });
                }
            }
        },
        [],
    );

    const estadoGrupo = useCallback(
        (clave: string): EstadoDetalleGrupo =>
            resolverEstadoGrupo(
                consultas[clave],
                Boolean(cargando[clave]),
                ahora,
                progreso[clave] ?? null,
            ),
        [cargando, consultas, ahora, progreso],
    );

    const horarioParaTarjeta = useCallback(
        (horario: Horario, clave: string): Horario => {
            const estaCargando = Boolean(cargando[clave]);
            const { mostrarDetalle } = resolverEstadoGrupo(
                consultas[clave],
                estaCargando,
                ahora,
            );
            return prepararHorarioParaTarjeta(
                horario,
                porHorario[horario.id],
                mostrarDetalle,
                ahora,
                estaCargando,
            );
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
