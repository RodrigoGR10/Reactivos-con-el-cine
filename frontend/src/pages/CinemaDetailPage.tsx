import { useParams, Link, useLocation } from "react-router-dom";
import { Mensaje } from "../components/common/Mensaje";
import { useAuth } from "../context/AuthContext";
import { useFavorites } from "../context/FavoritesContext";
import { useDetalleCine } from "../hooks/useDetalleCine";
import { useDetalleFunciones } from "../hooks/useDetalleFunciones";
import { useCinemaScheduleFilters } from "../hooks/useCinemaScheduleFilters";
import { useScrollIndicadores } from "../hooks/useScrollIndicadores";
import { CinemaDetailSkeleton } from "./cine/CinemaDetailSkeleton";
import { CinemaDetailHeader } from "./cine/CinemaDetailHeader";
import { CinemaDetailFilters } from "./cine/CinemaDetailFilters";
import { CinemaMoviesList } from "./cine/CinemaMoviesList";
import { obtenerVolverA } from "../utils/navegacion";
import "./CinemaDetailPage.css";

/** Muestra la información de un cine y filtra sus películas y funciones. */
function CinemaDetailPage() {
    const { id } = useParams<{ id: string }>();
    const location = useLocation();
    const volverA = obtenerVolverA(location.state, {
        to: "/cines",
        label: "Volver a cines",
    });
    const { user, openAuthModal } = useAuth();
    const { isFavoriteCinema, toggleFavoriteCinema } = useFavorites();
    const { cine, horarios, peliculas, cargando, noEncontrado, error } =
        useDetalleCine(id);
    const detalle = useDetalleFunciones();
    const filtros = useCinemaScheduleFilters(horarios, peliculas);

    useScrollIndicadores(".detalle-cine-page .horarios-grid-cine", [
        filtros.gruposFiltrados,
        filtros.fechaActual,
        filtros.formatoActual,
        filtros.busqueda,
        cargando,
    ]);

    if (cargando) {
        return <CinemaDetailSkeleton volverA={volverA} />;
    }

    if (error || !cine) {
        return (
            <Mensaje
                tipo="error"
                titulo={
                    noEncontrado || !cine
                        ? "Cine no encontrado"
                        : "Error al cargar el cine"
                }
                texto={
                    error ||
                    "El cine que buscas no existe o ya no está disponible."
                }
                accion={
                    <Link to="/cines" className="mensaje-accion-link">
                        ← Volver al listado de cines
                    </Link>
                }
            />
        );
    }

    const esFavorito = isFavoriteCinema(cine.id);

    const handleToggleFavorito = () => {
        if (!user) {
            openAuthModal();
            return;
        }
        toggleFavoriteCinema(cine.id);
    };

    return (
        <div className="detalle-cine-page">
            <CinemaDetailHeader
                cine={cine}
                volverA={volverA}
                esFavorito={esFavorito}
                onToggleFavorito={handleToggleFavorito}
            />

            {/* Sección Cartelera del Cine */}
            <section className="detalle-cine-cartelera-sec">
                <div className="cartelera-sec-header">
                    <div>
                        <p className="subtitulo-seccion">
                            Funciones disponibles
                        </p>
                        <h2>Cartelera</h2>
                    </div>
                    <p className="conteo-peliculas-cine" aria-live="polite">
                        {filtros.gruposFiltrados.length}{" "}
                        {filtros.gruposFiltrados.length === 1
                            ? "película"
                            : "películas"}
                    </p>
                </div>

                <CinemaDetailFilters
                    filtros={filtros}
                    totalHorarios={horarios.length}
                />

                <CinemaMoviesList
                    cine={cine}
                    filtros={filtros}
                    detalle={detalle}
                    totalHorarios={horarios.length}
                />
            </section>
        </div>
    );
}

export default CinemaDetailPage;
