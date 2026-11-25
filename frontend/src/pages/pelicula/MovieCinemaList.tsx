import { Link, useLocation } from "react-router-dom";
import { LogoCine } from "../../components/cines/LogoCine";
import { BotonFavorito } from "../../components/common/BotonFavorito";
import { AvisoUbicacion } from "../../components/common/Mensaje";
import { BotonDetalleFunciones } from "../../components/funciones/BotonDetalleFunciones";
import TarjetaFuncion from "../../components/funciones/TarjetaFuncion";
import { useAuth } from "../../context/AuthContext";
import { useFavorites } from "../../context/FavoritesContext";
import {
    claveDetalle,
    type useDetalleFunciones,
} from "../../hooks/useDetalleFunciones";
import type { useMovieScheduleFilters } from "../../hooks/useMovieScheduleFilters";
import type { Pelicula } from "../../types/types";
import { formatearDistancia } from "../../utils/distancia";

interface MovieCinemaListProps {
    pelicula: Pelicula;
    filtros: ReturnType<typeof useMovieScheduleFilters>;
    detalle: ReturnType<typeof useDetalleFunciones>;
}

/**
 * Agrupa funciones por cine y conecta favoritos, ubicación y consulta de detalle.
 * @param pelicula Película cuyas funciones se muestran.
 * @param filtros Grupos filtrados y acciones del hook de filtros.
 * @param detalle Estado y acciones de consulta de precios y butacas.
 * @returns Elemento de interfaz que representa el componente con las propiedades recibidas.
 */
export function MovieCinemaList({
    pelicula,
    filtros,
    detalle,
}: MovieCinemaListProps) {
    const location = useLocation();
    const { user, openAuthModal } = useAuth();
    const { toggleFavoriteCinema, isFavoriteCinema } = useFavorites();

    const {
        grupos,
        gruposFiltrados,
        fechaActual,
        horariosDelDia,
        restablecerFiltros,
        estadoUbicacion,
        descartarAvisoUbicacion,
    } = filtros;

    if (grupos.length === 0) {
        return (
            <div className="sin-funciones">
                <span aria-hidden="true">🎬</span>
                <p>No hay funciones vigentes para esta fecha.</p>
            </div>
        );
    }

    if (gruposFiltrados.length === 0) {
        return (
            <div className="sin-funciones">
                <span aria-hidden="true">🎬</span>
                <p>No se encontraron cines con los filtros seleccionados.</p>
                <button
                    type="button"
                    className="btn-reset-filtros"
                    onClick={restablecerFiltros}
                >
                    Restablecer filtros
                </button>
            </div>
        );
    }

    return (
        <>
            <AvisoUbicacion
                estado={estadoUbicacion}
                onCerrar={descartarAvisoUbicacion}
                className="detalle-aviso-ubicacion"
            />
            <div className="lista-cines">
                {gruposFiltrados.map(
                    ({ cine, horarios: sesiones, distancia }) => {
                        const clave = claveDetalle(
                            pelicula.id,
                            cine.id,
                            fechaActual,
                        );
                        const estadoDetalle = detalle.estadoGrupo(clave);
                        const horariosGrupo = horariosDelDia.filter(
                            (h) => h.cineId === cine.id,
                        );
                        const esCineFavorito = Boolean(
                            user && isFavoriteCinema(cine.id),
                        );
                        const etiquetaFavCine = esCineFavorito
                            ? `Quitar ${cine.nombre} de cines favoritos`
                            : `Guardar ${cine.nombre} en cines favoritos`;

                        const destinoVolverPelicula = {
                            volverA: {
                                to: `/peliculas/${pelicula.id}${location.search}`,
                                label: `Volver a ${pelicula.titulo}`,
                            },
                        };

                        return (
                            <article key={cine.id} className="tarjeta-cine">
                                <div className="cabecera-cine">
                                    <div className="cabecera-cine-left">
                                        <Link
                                            to={`/cines/${cine.id}`}
                                            state={destinoVolverPelicula}
                                            className="logo-cine-link"
                                            tabIndex={-1}
                                            aria-hidden="true"
                                        >
                                            <LogoCine
                                                cine={cine}
                                                alt=""
                                                tamano="md"
                                                className="logo-cine-enlazado"
                                            />
                                        </Link>

                                        <div className="nombre-cine">
                                            <div className="nombre-cine-titulo">
                                                <strong>
                                                    <Link
                                                        to={`/cines/${cine.id}`}
                                                        state={
                                                            destinoVolverPelicula
                                                        }
                                                        className="enlace-cine-detalle"
                                                    >
                                                        {cine.nombre}
                                                    </Link>
                                                </strong>
                                                {Number.isFinite(distancia) && (
                                                    <span className="distancia-cine">
                                                        {formatearDistancia(
                                                            distancia,
                                                        )}
                                                    </span>
                                                )}
                                                <BotonFavorito
                                                    className="boton-fav-inline"
                                                    activo={esCineFavorito}
                                                    ariaLabel={etiquetaFavCine}
                                                    title={etiquetaFavCine}
                                                    onClick={() => {
                                                        if (!user) {
                                                            openAuthModal();
                                                            return;
                                                        }
                                                        toggleFavoriteCinema(
                                                            cine.id,
                                                        );
                                                    }}
                                                />
                                            </div>
                                            <span>
                                                {cine.comuna} ·{" "}
                                                {sesiones.length}{" "}
                                                {sesiones.length === 1
                                                    ? "horario"
                                                    : "horarios"}
                                            </span>
                                        </div>
                                    </div>

                                    <BotonDetalleFunciones
                                        cargando={estadoDetalle.cargando}
                                        enCooldown={estadoDetalle.enCooldown}
                                        consultadoEn={
                                            estadoDetalle.consultadoEn
                                        }
                                        avisoError={estadoDetalle.avisoError}
                                        contexto={cine.nombre}
                                        totalFunciones={horariosGrupo.length}
                                        progreso={estadoDetalle.progreso}
                                        onConsultar={() =>
                                            detalle.consultar(
                                                pelicula.id,
                                                cine.id,
                                                fechaActual,
                                                horariosGrupo,
                                            )
                                        }
                                    />
                                </div>
                                <div className="horarios-grid-cine">
                                    {sesiones.map((h) => (
                                        <TarjetaFuncion
                                            key={h.id}
                                            horario={detalle.horarioParaTarjeta(
                                                h,
                                                clave,
                                            )}
                                            pelicula={pelicula}
                                            cine={cine}
                                            mostrarDetalle={
                                                estadoDetalle.mostrarDetalle
                                            }
                                            cargando={estadoDetalle.cargando}
                                        />
                                    ))}
                                </div>
                            </article>
                        );
                    },
                )}
            </div>
        </>
    );
}
