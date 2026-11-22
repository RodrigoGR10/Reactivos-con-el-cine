import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Skeleton } from "@mantine/core";
import type { Cine } from "../../types/types";
import { formatearDistancia } from "../../utils/distancia";
import { MapPinIcon } from "../common/Icons";
import { LogoCine } from "./LogoCine";
import "./TarjetaCine.css";

/** Propiedades de presentación, navegación y acción de una tarjeta de cine. */
interface TarjetaCineProps {
    /** Información del cine que se muestra. */
    cine: Cine;
    /** Distancia calculada desde la ubicación de la persona, en kilómetros. */
    distancia?: number;
    /** Acción secundaria, como el botón para marcar el cine favorito. */
    accion?: ReactNode;
    /** Si es `false`, el nombre no enlaza al detalle. Por defecto es `true`. */
    navegable?: boolean;
    /** Nivel HTML del nombre, por defecto `h3`. */
    nivelTitulo?: "h2" | "h3";
    /** Estado de React Router que se envía al abrir el enlace. */
    estadoEnlace?: unknown;
}

/** Muestra logo, nombre, comuna y acciones opcionales de un cine.
 * @param props Propiedades que determinan el contenido y las acciones del componente.
 * @returns Elemento de interfaz que representa el componente con las propiedades recibidas.
 */
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

/** Muestra el placeholder de carga con las proporciones de `TarjetaCine`.
 * @returns Elemento de interfaz que representa el componente con las propiedades recibidas.
 */
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
