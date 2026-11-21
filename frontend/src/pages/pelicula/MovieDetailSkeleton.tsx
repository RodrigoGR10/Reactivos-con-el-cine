import { Skeleton } from "@mantine/core";
import { Link } from "react-router-dom";
import type { RutaRetorno } from "../../utils/navegacion";

const CINES_DETALLE_ESQUELETO = [0, 1];
const HORARIOS_ESQUELETO = [0, 1, 2];

interface MovieDetailSkeletonProps {
  volverA: RutaRetorno;
}

export function MovieDetailSkeleton({ volverA }: MovieDetailSkeletonProps) {
  return (
    <div className="detalle-pelicula" role="status" aria-busy="true">
      <span className="visualmente-oculto">Cargando película...</span>
      <nav className="detalle-pelicula-nav">
        <Link to={volverA.to} className="btn-volver-cartelera">
          ← {volverA.label}
        </Link>
      </nav>
      <section className="hero-detalle" aria-hidden="true">
        <div className="poster-detalle poster-detalle-skeleton">
          <Skeleton height="100%" radius={0} />
        </div>
        <div className="contenido-detalle">
          <div className="detalle-estado-fila">
            <Skeleton width={110} height={14} radius="sm" />
          </div>
          <Skeleton width="68%" height={40} radius="md" mb={14} />
          <div className="metadatos-detalle">
            <Skeleton width={110} height={18} radius="sm" />
            <Skeleton width={68} height={18} radius="sm" />
            <Skeleton width={46} height={24} radius={4} />
          </div>
          <Skeleton width="100%" height={16} radius="sm" mb={10} />
          <Skeleton width="92%" height={16} radius="sm" mb={10} />
          <Skeleton width="64%" height={16} radius="sm" />
          <div className="acciones-detalle">
            <Skeleton width={132} height={42} radius={10} />
          </div>
        </div>
      </section>

      <Skeleton height={48} radius={8} mb={36} />

      <section className="seccion-funciones" aria-hidden="true">
        <div className="encabezado-funciones">
          <div>
            <Skeleton width={120} height={13} radius="sm" mb={6} />
            <Skeleton width={140} height={26} radius="sm" />
          </div>
          <Skeleton width={76} height={30} radius={20} />
        </div>

        <div className="fechas-skeleton-row">
          <Skeleton width={92} height={54} radius={10} />
          <Skeleton width={92} height={54} radius={10} />
        </div>

        <div className="lista-cines">
          {CINES_DETALLE_ESQUELETO.map((idx) => (
            <div key={idx} className="tarjeta-cine">
              <div className="cabecera-cine">
                <div className="cabecera-cine-left">
                  <Skeleton
                    width={58}
                    height={58}
                    radius={10}
                    style={{ flexShrink: 0 }}
                  />
                  <div className="nombre-cine">
                    <Skeleton width={190} height={22} radius="sm" maw="100%" />
                    <Skeleton width={130} height={15} radius="sm" maw="100%" />
                  </div>
                </div>
                <Skeleton width={136} height={36} radius={8} />
              </div>
              <div className="horarios-grid-cine">
                {HORARIOS_ESQUELETO.map((hIdx) => (
                  <Skeleton
                    key={hIdx}
                    width={116}
                    height={58}
                    radius={10}
                    style={{ flexShrink: 0 }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
