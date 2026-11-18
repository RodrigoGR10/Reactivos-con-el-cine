import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { Cine } from "../../types/types";
import { obtenerLogoCine } from "../../utils/agruparCines";
import { formatearDistancia } from "../../utils/distancia";
import { FilmIcon, MapPinIcon } from "../common/Icons";
import "./TarjetaCine.css";

interface TarjetaCineProps {
  cine: Cine;
  distancia?: number;
  accion?: ReactNode;
  navegable?: boolean;
  nivelTitulo?: "h2" | "h3";
}

export function TarjetaCine({
  cine,
  distancia,
  accion,
  navegable = true,
  nivelTitulo = "h3",
}: TarjetaCineProps) {
  const logo = obtenerLogoCine(cine);
  const Heading = nivelTitulo;

  return (
    <article className="cine-card">
      <div className="cine-card-header">
        <div className="cine-logo-container" data-origen={cine.origen}>
          {logo ? (
            <img
              src={logo}
              alt={`Logo de ${cine.nombre}`}
              className="cine-card-logo"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <FilmIcon size={24} />
          )}
        </div>
        {accion}
      </div>
      <div className="cine-card-body">
        <Heading className="cine-card-nombre">
          {navegable ? (
            <Link to={`/cines/${cine.id}`} className="cine-card-link">
              {cine.nombre}
            </Link>
          ) : (
            cine.nombre
          )}
        </Heading>
        <p className="cine-card-comuna">
          <MapPinIcon size={14} />
          <span>{cine.comuna}</span>
          {distancia !== undefined && Number.isFinite(distancia) && (
            <span className="distancia-cine">
              {formatearDistancia(distancia)}
            </span>
          )}
        </p>
      </div>
    </article>
  );
}
