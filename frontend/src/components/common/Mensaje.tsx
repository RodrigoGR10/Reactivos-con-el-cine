import type { ReactNode } from "react";
import { Alert, Loader } from "@mantine/core";
import { AlertCircleIcon } from "./Icons";
import "./Mensaje.css";

export type TipoMensaje = "estado" | "cargando" | "error";

interface MensajeProps {
  texto: string;
  tipo?: TipoMensaje;
  titulo?: string;
  compacto?: boolean;
  accion?: ReactNode;
  className?: string;
}

/**
 * Muestra estados de carga (Loader), errores (Alert de Mantine) o avisos centrados
 * alineados con la estética oscura del proyecto.
 */
export function Mensaje({
  texto,
  tipo = "estado",
  titulo,
  compacto = false,
  accion,
  className = "",
}: MensajeProps) {
  if (tipo === "error") {
    if (compacto) {
      return (
        <Alert
          variant="light"
          color="cine"
          radius="md"
          icon={<AlertCircleIcon size={18} />}
          title={titulo}
          className={`mensaje-alerta-compacta ${className}`.trim()}
        >
          <div className="mensaje-alerta-contenido">
            <p>{texto}</p>
            {accion}
          </div>
        </Alert>
      );
    }

    return (
      <div className={`mensaje-pagina ${className}`.trim()}>
        <Alert
          variant="default"
          radius={12}
          title={titulo}
          className="mensaje-panel-error"
        >
          <div className="mensaje-alerta-contenido">
            <p>{texto}</p>
            {accion}
          </div>
        </Alert>
      </div>
    );
  }

  if (tipo === "cargando") {
    const contenido = (
      <div
        className={`mensaje-carga ${compacto ? className : ""}`.trim()}
        role="status"
        aria-live="polite"
      >
        <Loader size={compacto ? "xs" : "sm"} color="cine" aria-hidden="true" />
        <p>{texto}</p>
      </div>
    );

    if (compacto) return contenido;

    return (
      <div
        className={`mensaje-pagina mensaje-pagina--centrado ${className}`.trim()}
      >
        {contenido}
      </div>
    );
  }

  if (compacto) {
    return <p className={className}>{texto}</p>;
  }

  return (
    <div className={`mensaje-pagina ${className}`.trim()}>
      <div className="mensaje-estado-caja">
        <p>{texto}</p>
      </div>
    </div>
  );
}
