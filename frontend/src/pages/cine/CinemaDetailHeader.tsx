import { Link } from "react-router-dom";
import { LogoCine } from "../../components/cines/LogoCine";
import { HeartIcon, MapPinIcon } from "../../components/common/Icons";
import { normalizarTexto } from "../../utils/normalizarTexto";
import type { RutaRetorno } from "../../utils/navegacion";
import type { Cine } from "../../types/types";

interface CinemaDetailHeaderProps {
    cine: Cine;
    volverA: RutaRetorno;
    esFavorito: boolean;
    onToggleFavorito: () => void;
}

/** Dirección del cine, agregando la comuna solo si la dirección no la incluye. */
function obtenerUbicacion(cine: Cine): string | undefined {
    const direccion = cine.direccion?.trim();
    const comuna = cine.comuna?.trim();
    if (!direccion) return comuna;
    if (comuna && !normalizarTexto(direccion).includes(normalizarTexto(comuna))) {
        return `${direccion}, ${comuna}`;
    }
    return direccion;
}

export function CinemaDetailHeader({
    cine,
    volverA,
    esFavorito,
    onToggleFavorito,
}: CinemaDetailHeaderProps) {
    const ubicacionCine = obtenerUbicacion(cine);

    return (
        <>
            <nav className="detalle-cine-nav">
                <Link to={volverA.to} className="btn-volver-cines">
                    ← {volverA.label}
                </Link>
            </nav>

            <header className="detalle-cine-header">
                <div className="detalle-cine-header-main">
                    <LogoCine cine={cine} tamano="lg" />
                    <div className="detalle-cine-info">
                        <h1 className="detalle-cine-nombre">{cine.nombre}</h1>
                        {ubicacionCine && (
                            <p className="detalle-cine-comuna">
                                <MapPinIcon size={16} />
                                <span>{ubicacionCine}</span>
                            </p>
                        )}
                    </div>
                </div>

                <div className="detalle-cine-header-actions">
                    <button
                        type="button"
                        className={`btn-fav-cine-detalle ${esFavorito ? "active" : ""}`}
                        aria-pressed={esFavorito}
                        aria-label={
                            esFavorito
                                ? `Quitar ${cine.nombre} de cines habituales`
                                : `Guardar ${cine.nombre} en cines habituales`
                        }
                        onClick={onToggleFavorito}
                        title={
                            esFavorito
                                ? "Quitar de cines habituales"
                                : "Guardar en cines habituales"
                        }
                    >
                        <HeartIcon
                            size={16}
                            filled={esFavorito}
                            className="icono-fav-cine"
                        />
                        <span>
                            {esFavorito ? "Cine habitual" : "Guardar cine"}
                        </span>
                    </button>
                </div>
            </header>
        </>
    );
}
