import type { ReactNode } from "react";
import { Alert, Loader } from "@mantine/core";
import type { EstadoUbicacion } from "../../hooks/useUbicacion";
import { AlertCircleIcon } from "./Icons";
import "./Mensaje.css";

/**
 * Tipo compartido por los componentes de la aplicación.
 */
export type TipoMensaje = "estado" | "cargando" | "error";

/** Propiedades para mostrar estado, carga, error y una acción opcional. */
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
/**
 * Renderiza mensajes uniformes para estados, cargas y errores de las vistas.
 * @param props Tipo, texto, título y elementos opcionales del mensaje.
 * @returns Elemento de interfaz que representa el componente con las propiedades recibidas.
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

const textosUbicacion: Record<
    Exclude<EstadoUbicacion, "inactivo" | "cargando" | "listo">,
    string
> = {
    denegado:
        "No pudimos acceder a tu ubicación. Habilita el permiso en tu navegador para ordenar por cercanía.",
    "sin-posicion":
        "Tu ubicación no está disponible en este momento. Revisa que la ubicación esté activada en tu dispositivo y vuelve a intentar.",
    "tiempo-agotado":
        "El navegador tardó demasiado en obtener tu ubicación. Intenta otra vez.",
    "sin-soporte": "Este navegador no ofrece acceso a la ubicación.",
    "conexion-insegura":
        "Para usar tu ubicación, abre esta página con una conexión HTTPS.",
    error: "No se pudo obtener tu ubicación. Intenta nuevamente.",
};

interface AvisoUbicacionProps {
    estado: EstadoUbicacion;
    onCerrar: () => void;
    className?: string;
}

/**
 * Muestra un aviso cerrable cuando se rechaza o falla la geolocalización.
 * @param estado Estado de ubicación que determina si se presenta el aviso.
 * @param onCerrar Acción para cerrar el aviso.
 * @param className Clase CSS adicional opcional.
 * @returns Elemento de interfaz que representa el componente con las propiedades recibidas.
 */
export function AvisoUbicacion({
    estado,
    onCerrar,
    className = "",
}: AvisoUbicacionProps) {
    if (estado === "inactivo" || estado === "cargando" || estado === "listo")
        return null;

    return (
        <Mensaje
            tipo="error"
            compacto
            texto={textosUbicacion[estado]}
            onCerrar={onCerrar}
            cerrarLabel="Cerrar aviso de ubicación"
            className={className}
        />
    );
}
