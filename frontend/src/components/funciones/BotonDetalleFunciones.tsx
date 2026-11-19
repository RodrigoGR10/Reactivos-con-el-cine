import { useEffect, useState } from "react";
import { Loader, Tooltip } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { formatearTiempoRelativo } from "../../utils/detalleFunciones";
import "./BotonDetalleFunciones.css";

const TOOLTIP_EVENTS_DESKTOP = { hover: true, focus: true, touch: false } as const;

interface BotonDetalleFuncionesProps {
  cargando: boolean;
  enCooldown: boolean;
  consultadoEn: number | null;
  avisoError: string | null;
  contexto: string;
  onConsultar: () => void;
}

/** Reloj local aislado para evitar re-renderizar toda la vista detalle cada minuto. */
function TiempoActualizado({ consultadoEn }: { consultadoEn: number }) {
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    const actualizar = () => {
      const actual = Date.now();
      setAhora((prev) =>
        Math.floor(Math.max(0, prev - consultadoEn) / 60_000) ===
        Math.floor(Math.max(0, actual - consultadoEn) / 60_000)
          ? prev
          : actual,
      );
    };

    const transcurrido = Math.max(0, Date.now() - consultadoEn);
    const hastaSiguienteMinuto =
      (Math.floor(transcurrido / 60_000) + 1) * 60_000 - transcurrido;

    const timeout = setTimeout(actualizar, Math.max(50, hastaSiguienteMinuto + 25));
    const alCambiarVisibilidad = () => {
      if (document.visibilityState === "visible") actualizar();
    };
    document.addEventListener("visibilitychange", alCambiarVisibilidad);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener("visibilitychange", alCambiarVisibilidad);
    };
  }, [consultadoEn, ahora]);

  return (
    <span className="detalle-estado-tiempo">
      {formatearTiempoRelativo(consultadoEn, Math.max(ahora, consultadoEn))}
    </span>
  );
}

/** Cabecera derecha para consultar detalle, mostrar timestamp relativo o avisos y respetar cooldown. */
export function BotonDetalleFunciones({
  cargando,
  enCooldown,
  consultadoEn,
  avisoError,
  contexto,
  onConsultar,
}: BotonDetalleFuncionesProps) {
  const desactivarTooltip =
    useMediaQuery("(max-width: 600px), (hover: none), (pointer: coarse)") ?? false;
  const textoVisible = cargando ? "Consultando..." : "Consultar detalle";
  const deshabilitado = cargando || enCooldown;
  const tooltipTexto = enCooldown
    ? "Detalle actualizado recientemente"
    : "Consultar precio y disponibilidad";

  return (
    <div className="funciones-acciones">
      {(avisoError || consultadoEn !== null) && (
        <p className="detalle-estado-meta">
          {avisoError && (
            <>
              <span className="detalle-estado-alerta" role="alert">
                {avisoError}
              </span>
              {consultadoEn !== null && (
                <span className="detalle-estado-separador" aria-hidden="true">
                  {" · "}
                </span>
              )}
            </>
          )}
          {consultadoEn !== null && (
            <TiempoActualizado key={consultadoEn} consultadoEn={consultadoEn} />
          )}
        </p>
      )}
      <Tooltip
        label={tooltipTexto}
        position="top"
        offset={8}
        openDelay={250}
        floatingStrategy="fixed"
        disabled={desactivarTooltip || cargando}
        events={TOOLTIP_EVENTS_DESKTOP}
      >
        <span className="btn-consultar-tooltip-wrap">
          <button
            type="button"
            className="btn-consultar-detalle"
            disabled={deshabilitado}
            aria-busy={cargando || undefined}
            aria-label={`${textoVisible} para ${contexto}`}
            onClick={onConsultar}
          >
            {cargando && (
              <Loader size={13} color="currentColor" aria-hidden="true" />
            )}
            <span>{textoVisible}</span>
          </button>
        </span>
      </Tooltip>
    </div>
  );
}
