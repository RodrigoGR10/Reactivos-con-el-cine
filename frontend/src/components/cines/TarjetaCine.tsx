import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Skeleton } from "@mantine/core";
import type { Cine } from "../../types/types";
import { formatearDistancia } from "../../utils/distancia";
import { MapPinIcon } from "../common/Icons";
import { LogoCine } from "./LogoCine";
import "./TarjetaCine.css";

interface TarjetaCineProps {
  cine: Cine;
  distancia?: number;
  accion?: ReactNode;
  navegable?: boolean;
  nivelTitulo?: "h2" | "h3";
  estadoEnlace?: unknown;
}

export function TarjetaCine({
  cine,
  distancia,
  accion,
  navegable = true,
  nivelTitulo = "h3",
  estadoEnlace,
}: TarjetaCineProps) {
  const Heading = nivelTitulo;

  return (
    <article className="cine-card">
      <div className="cine-card-header">
        <LogoCine cine={cine} tamano="sm" cargaDiferida />
        {accion}
      </div>
      <div className="cine-card-body">
        <Heading className="cine-card-nombre">
          {navegable ? (
            <Link
              to={`/cines/${cine.id}`}
              state={estadoEnlace}
              className="cine-card-link"
            >
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

/** Esqueleto de carga con las proporciones exactas de `TarjetaCine`. */
export function TarjetaCineSkeleton() {
  return (
    <div className="cine-card" aria-hidden="true">
      <div className="cine-card-header">
        <Skeleton width={46} height={46} radius={7} />
        <Skeleton height={34} circle />
      </div>
      <div className="cine-card-body">
        <Skeleton height={22} width="72%" radius="sm" />
        <Skeleton height={16} width="45%" radius="sm" />
      </div>
    </div>
  );
}
