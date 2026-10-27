import { useCallback, useEffect, useRef, useState } from "react";
import funcionesService from "../services/funciones";
import type { Horario } from "../types/types";

type DatosButacas = Pick<Horario, "butacas" | "estadoButacas" | "butacasReintentarEn" | "agotada">;
export const claveButacas = (peliculaId: string, cineId: string, fecha: string) => `${peliculaId}:${cineId}:${fecha}`;

export function useButacasFunciones() {
  const [porHorario, setPorHorario] = useState<Record<string, DatosButacas>>({});
  const [cargando, setCargando] = useState<Record<string, boolean>>({});
  const [errores, setErrores] = useState<Record<string, string | null>>({});
  const pendientes = useRef(new Map<string, AbortController>());

  useEffect(() => {
    const consultas = pendientes.current;
    return () => { for (const controller of consultas.values()) controller.abort(); consultas.clear(); };
  }, []);

  const consultar = useCallback(async (peliculaId: string, cineId: string, fecha: string) => {
    if (!peliculaId || !cineId || !fecha) return;
    const clave = claveButacas(peliculaId, cineId, fecha);
    if (pendientes.current.has(clave)) return;
    const controller = new AbortController();
    pendientes.current.set(clave, controller);
    setCargando(prev => ({ ...prev, [clave]: true }));
    setErrores(prev => ({ ...prev, [clave]: null }));
    try {
      const horarios = await funcionesService.getButacas(peliculaId, cineId, fecha, controller.signal);
      if (controller.signal.aborted) return;
      setPorHorario(prev => ({
        ...prev,
        ...Object.fromEntries(horarios.map(({ id, butacas, estadoButacas, butacasReintentarEn, agotada }) => [id, { butacas, estadoButacas, butacasReintentarEn, agotada }])),
      }));
      if (horarios.some(h => h.estadoButacas === "error")) {
        setErrores(prev => ({ ...prev, [clave]: "No se pudieron actualizar algunas butacas. Reintenta en un minuto." }));
      }
    } catch {
      if (!controller.signal.aborted) setErrores(prev => ({ ...prev, [clave]: "No se pudieron consultar las butacas. Intenta nuevamente." }));
    } finally {
      if (pendientes.current.get(clave) === controller) pendientes.current.delete(clave);
      if (!controller.signal.aborted) setCargando(prev => ({ ...prev, [clave]: false }));
    }
  }, []);

  return { porHorario, cargando, errores, consultar };
}
