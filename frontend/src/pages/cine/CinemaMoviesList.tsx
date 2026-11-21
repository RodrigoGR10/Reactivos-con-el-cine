import { Link } from "react-router-dom";
import { BotonFavorito } from "../../components/common/BotonFavorito";
import { BotonDetalleFunciones } from "../../components/funciones/BotonDetalleFunciones";
import { TarjetaFuncion } from "../../components/funciones/TarjetaFuncion";
import { useAuth } from "../../context/AuthContext";
import { useFavorites } from "../../context/FavoritesContext";
import {
    claveDetalle,
    type useDetalleFunciones,
} from "../../hooks/useDetalleFunciones";
import type { useCinemaScheduleFilters } from "../../hooks/useCinemaScheduleFilters";
import type { Cine } from "../../types/types";

interface CinemaMoviesListProps {
    cine: Cine;
    filtros: ReturnType<typeof useCinemaScheduleFilters>;
    detalle: ReturnType<typeof useDetalleFunciones>;
    totalHorarios: number;
}

export function CinemaMoviesList({
    cine,
    filtros,
    detalle,
    totalHorarios,
}: CinemaMoviesListProps) {
    const { user, openAuthModal } = useAuth();
    const { isFavoriteMovie, toggleFavoriteMovie } = useFavorites();
    const { fechaActual, horariosDelDia, gruposFiltrados, restablecerFiltros } =
        filtros;

    if (totalHorarios === 0) {
        return (
            <div className="cartelera-cine-empty">
                <p>No hay funciones programadas para este cine en este momento.</p>
            </div>
        );
    }

    if (gruposFiltrados.length === 0) {
        return (
            <div className="cartelera-cine-empty">
                <p>No se encontraron películas con los filtros seleccionados.</p>
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
        <div className="peliculas-cine-lista">
            {gruposFiltrados.map(({ pelicula, horarios: horariosPeli }) => {
                const clave = claveDetalle(pelicula.id, cine.id, fechaActual);
                const estadoDetalle = detalle.estadoGrupo(clave);
                const horariosGrupo = horariosDelDia.filter(
                    (h) => h.peliculaId === pelicula.id,
                );
                const esPeliculaFavorita = Boolean(
                    user && isFavoriteMovie(pelicula.id),
                );
                const etiquetaFavPelicula = esPeliculaFavorita
                    ? `Quitar ${pelicula.titulo} de películas favoritas`
                    : `Guardar ${pelicula.titulo} en películas favoritas`;

                const destinoVolverCine = {
                    volverA: {
                        to: `/cines/${cine.id}`,
                        label: `Volver a ${cine.nombre}`,
                    },
                };

                return (
                    <article key={pelicula.id} className="pelicula-cine-card">
                        {/* Póster de la película */}
                        <Link
                            to={`/peliculas/${pelicula.id}`}
                            state={destinoVolverCine}
                            className="pelicula-cine-poster-link"
                        >
                            <img
                                src={pelicula.poster}
                                alt={`Póster de ${pelicula.titulo}`}
                                className="pelicula-cine-poster"
                            />
                        </Link>

                        {/* Información y horarios */}
                        <div className="pelicula-cine-content">
                            <div className="pelicula-cine-header-info">
                                <div className="pelicula-cine-header-text">
                                    <div className="pelicula-cine-titulo">
                                        <h3>
                                            <Link
                                                to={`/peliculas/${pelicula.id}`}
                                                state={destinoVolverCine}
                                                className="pelicula-cine-titulo-link"
                                            >
                                                {pelicula.titulo}
                                            </Link>
                                        </h3>
                                        <BotonFavorito
                                            className="boton-fav-inline"
                                            activo={esPeliculaFavorita}
                                            ariaLabel={etiquetaFavPelicula}
                                            title={etiquetaFavPelicula}
                                            onClick={() => {
                                                if (!user) {
                                                    openAuthModal();
                                                    return;
                                                }
                                                toggleFavoriteMovie(
                                                    pelicula.id,
                                                );
                                            }}
                                        />
                                    </div>
                                    <p className="pelicula-cine-metadatos">
                                        {pelicula.genero && (
                                            <span className="pelicula-cine-genero">
                                                {pelicula.genero}
                                            </span>
                                        )}
                                        {pelicula.duracion !== null && (
                                            <>
                                                {pelicula.genero && (
                                                    <span aria-hidden="true">
                                                        •
                                                    </span>
                                                )}
                                                <span>
                                                    {pelicula.duracion} min
                                                </span>
                                            </>
                                        )}
                                        {(pelicula.genero ||
                                            pelicula.duracion !== null) && (
                                            <span aria-hidden="true">•</span>
                                        )}
                                        <span className="badge-clasif">
                                            {pelicula.clasificacion}
                                        </span>
                                    </p>
                                </div>
                                <BotonDetalleFunciones
                                    cargando={estadoDetalle.cargando}
                                    enCooldown={estadoDetalle.enCooldown}
                                    consultadoEn={estadoDetalle.consultadoEn}
                                    avisoError={estadoDetalle.avisoError}
                                    contexto={pelicula.titulo}
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
                            {/* Agrupación de horarios con TarjetaFuncion */}
                            <div className="horarios-grid-cine">
                                {horariosPeli.map((h) => (
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
                        </div>
                    </article>
                );
            })}
        </div>
    );
}
