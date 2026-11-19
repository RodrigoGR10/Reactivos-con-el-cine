import type { Cine } from "../../types/types";
import { obtenerCadena, obtenerLogoCine } from "../../utils/agruparCines";
import { FilmIcon } from "../common/Icons";
import "./LogoCine.css";

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

/** Contenedor unificado de logo de cine o cadena con caja blanca, padding por origen y fallback. */
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
