import type { Cine } from "../../types/types";
import { obtenerCadena, obtenerLogoCine } from "../../utils/agruparCines";
import { FilmIcon } from "../common/Icons";
import "./LogoCine.css";

/**
 * Tipo compartido por los componentes de la aplicación.
 */
export type TamanoLogoCine = "xs" | "sm" | "md" | "lg";

const ICONO_FALLBACK: Record<TamanoLogoCine, number> = {
    xs: 18,
    sm: 24,
    md: 26,
    lg: 36,
};

interface LogoCineProps {
    cine?: Cine;
    src?: string;
    origen?: string;
    alt?: string;
    tamano?: TamanoLogoCine;
    className?: string;
    cargaDiferida?: boolean;
}

/**
 * Presenta el logo de un cine o cadena con tamaño, texto alternativo y fallback.
 * @param cine Datos del cine para resolver logo y origen cuando no se indica `src`.
 * @param src URL de imagen explícita opcional.
 * @param origen Identificador de cadena usado para ajustar la presentación.
 * @param alt Texto alternativo opcional; si falta se genera desde el cine.
 * @param tamano Tamaño de la caja: `xs`, `sm`, `md` o `lg` (por defecto `sm`).
 * @param className Clase CSS adicional.
 * @param cargaDiferida Si es `true`, el navegador carga la imagen de forma diferida.
 * @returns Elemento de interfaz que representa el componente con las propiedades recibidas.
 */
export function LogoCine({
    cine,
    src,
    origen,
    alt,
    tamano = "sm",
    className = "",
    cargaDiferida = false,
}: LogoCineProps) {
    const logoUrl = src ?? (cine ? obtenerLogoCine(cine) : undefined);
    const origenNormalizado =
        origen ?? (cine ? cine.origen || obtenerCadena(cine).id : undefined);
    const textoAlternativo = alt ?? (cine ? `Logo de ${cine.nombre}` : "");

    return (
        <div
            className={`logo-cine-caja logo-cine-caja--${tamano}${className ? ` ${className}` : ""}`}
            data-origen={origenNormalizado}
        >
            {logoUrl ? (
                <img
                    src={logoUrl}
                    alt={textoAlternativo}
                    className="logo-cine-imagen"
                    loading={cargaDiferida ? "lazy" : undefined}
                    decoding={cargaDiferida ? "async" : undefined}
                />
            ) : (
                <FilmIcon size={ICONO_FALLBACK[tamano]} />
            )}
        </div>
    );
}
