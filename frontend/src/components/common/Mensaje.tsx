import type { ReactNode } from "react";
import { Alert, Loader } from "@mantine/core";
import type { EstadoUbicacion } from "../../hooks/useUbicacion";
import { AlertCircleIcon } from "./Icons";
import "./Mensaje.css";

export type TipoMensaje = "estado" | "cargando" | "error";

interface MensajeProps {
    texto: string;
    tipo?: TipoMensaje;
    titulo?: string;
    compacto?: boolean;
    embebido?: boolean;
    accion?: ReactNode;
    onCerrar?: () => void;
    cerrarLabel?: string;
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
    embebido = false,
    accion,
    onCerrar,
    cerrarLabel = "Cerrar aviso",
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
                    withCloseButton={Boolean(onCerrar)}
                    onClose={onCerrar}
                    closeButtonLabel={cerrarLabel}
                    className={`mensaje-alerta-compacta ${className}`.trim()}
                >
                    <div className="mensaje-alerta-contenido">
                        <p>{texto}</p>
                        {accion}
                    </div>
                </Alert>
            );
        }

        const panelError = (
            <Alert
                variant="default"
                radius={12}
                title={titulo}
                className={`mensaje-panel-error ${embebido ? className : ""}`.trim()}
            >
                <div className="mensaje-alerta-contenido">
                    <p>{texto}</p>
                    {accion}
                </div>
            </Alert>
        );

        if (embebido) return panelError;

        return (
            <div className={`mensaje-pagina ${className}`.trim()}>
                {panelError}
            </div>
        );
    }

    if (tipo === "cargando") {
        const contenido = (
            <div
                className={`mensaje-carga ${compacto || embebido ? className : ""}`.trim()}
                role="status"
                aria-live="polite"
            >
                <Loader
                    size={compacto ? "xs" : "sm"}
                    color="cine"
                    aria-hidden="true"
                />
                <p>{texto}</p>
            </div>
        );

        if (compacto || embebido) return contenido;

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

    const cajaEstado = (
        <div
            className={`mensaje-estado-caja ${embebido ? className : ""}`.trim()}
        >
            <p>{texto}</p>
        </div>
    );

    if (embebido) return cajaEstado;

    return (
        <div className={`mensaje-pagina ${className}`.trim()}>{cajaEstado}</div>
    );
}

interface AvisoUbicacionProps {
    estado: EstadoUbicacion;
    onCerrar: () => void;
    className?: string;
}

/**
 * Banner compacto y cerrable para avisos de permiso o error de geolocalización.
 */
export function AvisoUbicacion({
    estado,
    onCerrar,
    className = "",
}: AvisoUbicacionProps) {
    if (estado !== "denegado" && estado !== "error") return null;

    const texto =
        estado === "denegado"
            ? "No pudimos acceder a tu ubicación. Habilita el permiso en tu navegador para ordenar por cercanía."
            : "No se pudo obtener tu ubicación. Intenta nuevamente.";

    return (
        <Mensaje
            tipo="error"
            compacto
            texto={texto}
            onCerrar={onCerrar}
            cerrarLabel="Cerrar aviso de ubicación"
            className={className}
        />
    );
}
