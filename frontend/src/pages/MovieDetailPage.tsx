import { useParams, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useFavorites } from "../context/FavoritesContext";
import { useDetallePelicula } from "../hooks/useDetallePelicula";
import { useDetalleFunciones } from "../hooks/useDetalleFunciones";
import { useMovieScheduleFilters } from "../hooks/useMovieScheduleFilters";
import { useScrollIndicadores } from "../hooks/useScrollIndicadores";
import { Mensaje } from "../components/common/Mensaje";
import { obtenerVolverA } from "../utils/navegacion";
import { MovieDetailSkeleton } from "./pelicula/MovieDetailSkeleton";
import { MovieDetailHero } from "./pelicula/MovieDetailHero";
import { MovieDetailFilters } from "./pelicula/MovieDetailFilters";
import { MovieCinemaList } from "./pelicula/MovieCinemaList";
import "./MovieDetailPage.css";

function MovieDetailPage() {
    const { id } = useParams();
    const location = useLocation();
    const volverA = obtenerVolverA(location.state, {
        to: "/",
        label: "Volver a cartelera",
    });
    const { user, openAuthModal } = useAuth();
    const { toggleFavoriteMovie, isFavoriteMovie } = useFavorites();
    const { pelicula, horarios, cines, error, noEncontrada } =
        useDetallePelicula(id);
    const detalle = useDetalleFunciones();

    const filtros = useMovieScheduleFilters(horarios, cines);
    useScrollIndicadores(".detalle-pelicula .horarios-grid-cine", [
        filtros.gruposFiltrados,
    ]);

    if (error) {
        return (
            <Mensaje
                tipo="error"
                titulo={
                    noEncontrada
                        ? "Película no encontrada"
                        : "Error al cargar lapelícula"
                }
                texto={error}
                accion={
                    <Link to="/" className="mensaje-accion-link">
                        ← Volver a cartelera
                    </Link>
                }
            />
        );
    }

    if (!pelicula) {
        return <MovieDetailSkeleton volverA={volverA} />;
    }

    return (
        <div className="detalle-pelicula">
            <nav className="detalle-pelicula-nav">
                <Link to={volverA.to} className="btn-volver-cartelera">
                    ← {volverA.label}
                </Link>
            </nav>

            <MovieDetailHero
                pelicula={pelicula}
                esFavorita={isFavoriteMovie(pelicula.id)}
                onToggleFavorite={() => {
                    if (!user) {
                        openAuthModal();
                        return;
                    }
                    toggleFavoriteMovie(pelicula.id);
                }}
            />

            <section
                className="seccion-funciones"
                aria-labelledby="titulo-funciones"
            >
                <div className="encabezado-funciones">
                    <div>
                        <p className="subtitulo-seccion">Elige dónde verla</p>
                        <h2 id="titulo-funciones">Funciones</h2>
                    </div>
                    <p className="conteo-cines-peli" aria-live="polite">
                        {filtros.gruposFiltrados.length}{" "}
                        {filtros.gruposFiltrados.length === 1
                            ? "cine"
                            : "cines"}
                    </p>
                </div>

                <MovieDetailFilters
                    filtros={filtros}
                    totalHorarios={horarios.length}
                />
                <MovieCinemaList
                    pelicula={pelicula}
                    filtros={filtros}
                    detalle={detalle}
                />
            </section>
        </div>
    );
}

export default MovieDetailPage;
