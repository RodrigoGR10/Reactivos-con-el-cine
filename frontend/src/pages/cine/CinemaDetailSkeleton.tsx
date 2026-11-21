import { Skeleton } from "@mantine/core";
import { Link } from "react-router-dom";
import type { RutaRetorno } from "../../utils/navegacion";

const PELICULAS_CINE_ESQUELETO = [0, 1];
const HORARIOS_CINE_ESQUELETO = [0, 1, 2];

interface CinemaDetailSkeletonProps {
    volverA: RutaRetorno;
}

export function CinemaDetailSkeleton({ volverA }: CinemaDetailSkeletonProps) {
    return (
        <div className="detalle-cine-page" role="status" aria-busy="true">
            <span className="visualmente-oculto">
                Cargando información del cine y su cartelera...
            </span>
            <nav className="detalle-cine-nav">
                <Link to={volverA.to} className="btn-volver-cines">
                    ← {volverA.label}
                </Link>
            </nav>

            <header className="detalle-cine-header" aria-hidden="true">
                <div className="detalle-cine-header-main">
                    <Skeleton
                        width={84}
                        height={84}
                        radius={16}
                        className="detalle-cine-logo-skeleton"
                        style={{ flexShrink: 0 }}
                    />
                    <div className="detalle-cine-info">
                        <Skeleton
                            width={240}
                            height={32}
                            radius="sm"
                            maw="100%"
                            className="detalle-cine-nombre-skeleton"
                        />
                        <Skeleton
                            width={190}
                            height={16}
                            radius="sm"
                            maw="100%"
                            className="detalle-cine-ubicacion-skeleton"
                        />
                    </div>
                </div>
                <div className="detalle-cine-header-actions">
                    <Skeleton width={152} height={44} radius={10} />
                </div>
            </header>

            <section className="detalle-cine-cartelera-sec" aria-hidden="true">
                <div className="cartelera-sec-header">
                    <div>
                        <Skeleton width={140} height={13} radius="sm" mb={6} />
                        <Skeleton
                            width={115}
                            height={26}
                            radius="sm"
                            maw="100%"
                        />
                    </div>
                    <Skeleton width={88} height={30} radius={20} />
                </div>

                <div className="fechas-skeleton-row">
                    <Skeleton width={92} height={54} radius={10} />
                    <Skeleton width={92} height={54} radius={10} />
                </div>

                <div className="peliculas-cine-lista">
                    {PELICULAS_CINE_ESQUELETO.map((idx) => (
                        <div key={idx} className="pelicula-cine-card">
                            <Skeleton
                                width={110}
                                height={165}
                                radius={10}
                                className="pelicula-cine-poster-skeleton"
                                style={{ flexShrink: 0 }}
                            />
                            <div className="pelicula-cine-content">
                                <div className="pelicula-cine-header-info">
                                    <div className="pelicula-cine-header-text">
                                        <Skeleton
                                            width={210}
                                            height={24}
                                            radius="sm"
                                            mb={8}
                                            maw="100%"
                                        />
                                        <Skeleton
                                            width={150}
                                            height={16}
                                            radius="sm"
                                            maw="100%"
                                        />
                                    </div>
                                    <Skeleton
                                        width={136}
                                        height={36}
                                        radius={8}
                                    />
                                </div>
                                <div className="horarios-grid-cine">
                                    {HORARIOS_CINE_ESQUELETO.map((hIdx) => (
                                        <Skeleton
                                            key={hIdx}
                                            width={108}
                                            height={58}
                                            radius={10}
                                            style={{ flexShrink: 0 }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
