import { useEffect, useState } from "react";
import type { Horario } from "../types/types";
import funcionService from "../services/funciones";

interface EstadoPrecios {
  clave: string;
  horarios: Horario[];
  cargando: boolean;
  error: string | null;
  recibido: boolean;
}

export function usePreciosFunciones(peliculaId: string | undefined, cineId: string, fecha: string) {
  const clave = peliculaId && cineId && fecha ? `${peliculaId}:${cineId}:${fecha}` : "";
  const [intento, setIntento] = useState(0);
  const [estado, setEstado] = useState<EstadoPrecios>({ clave: "", horarios: [], cargando: false, error: null, recibido: false });

  useEffect(() => {
    if (!clave || !peliculaId) return;
    const controller = new AbortController();
    let temporizador: ReturnType<typeof setTimeout>;
    let consultas = 0;

    const cargar = async () => {
      setEstado((anterior) => ({
        clave, horarios: anterior.clave === clave ? anterior.horarios : [],
        recibido: anterior.clave === clave && anterior.recibido, cargando: true, error: null,
      }));
      try {
        const horarios = await funcionService.getPrecios(peliculaId, cineId, fecha, controller.signal);
        if (controller.signal.aborted) return;
        const pendientes = horarios.some((horario) => horario.estadoPrecio === "consultando" || horario.estadoPrecio === "pendiente");
        const errores = horarios.some((horario) => horario.estadoPrecio === "error");
        consultas++;
        const seguir = pendientes && consultas < 20;
        setEstado({ clave, horarios, cargando: seguir, recibido: true, error: errores
          ? "No se pudieron actualizar algunos precios. Puedes volver a intentarlo en un minuto."
          : pendientes && !seguir ? "La consulta sigue en curso. Intenta nuevamente en un momento." : null });
        if (seguir) temporizador = setTimeout(cargar, 1500);
        else if (!errores && !pendientes) {
          const vencimientos = horarios.flatMap((horario) => horario.preciosConsultadosEn && !horario.agotada ? [Date.parse(horario.preciosConsultadosEn) + 15 * 60_000] : []);
          if (vencimientos.length) temporizador = setTimeout(cargar, Math.max(1000, Math.min(...vencimientos) - Date.now() + 100));
        }
      } catch {
        if (!controller.signal.aborted) {
          setEstado((anterior) => ({ ...anterior, clave, cargando: false, error: "No se pudieron consultar los precios. Intenta nuevamente." }));
        }
      }
    };
    cargar();
    return () => {
      controller.abort();
      clearTimeout(temporizador);
    };
  }, [clave, peliculaId, cineId, fecha, intento]);

  return {
    horarios: estado.clave === clave ? estado.horarios : [],
    cargando: estado.clave === clave ? estado.cargando : Boolean(clave),
    error: estado.clave === clave ? estado.error : null,
    recibido: estado.clave === clave && estado.recibido,
    reintentar: () => setIntento((anterior) => anterior + 1),
  };
}
