import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import type { Cine, Pelicula, Funcion } from "../types/types";
import cinesService from "../services/cines";
import funcionesService from "../services/funciones";
import peliculasService from "../services/peliculas";
import { useAuth } from "../context/AuthContext";
import { useFavorites } from "../context/FavoritesContext";
import { MapPinIcon, SearchIcon } from "../components/common/Icons";
import { agruparFuncionesPorPelicula } from "../utils/agruparFunciones";
import "./CinemaDetailPage.css";

/** Resuelve logo de cine: usa el provisto o infiere por nombre conocido */
const getCinemaLogo = (cine: Cine): string => {
  if (cine.logo) return cine.logo;
  const nameLower = cine.nombre.toLowerCase();
  if (nameLower.includes("cinemark")) return "/cinemark.png";
  if (nameLower.includes("cinepolis") || nameLower.includes("cinépolis"))
    return "/cinepolis.png";
  if (nameLower.includes("cineplanet")) return "/cineplanet.png";
  return "";
};

function CinemaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, openAuthModal } = useAuth();
  const { isFavoriteCinema, toggleFavoriteCinema } = useFavorites();

  const [cine, setCine] = useState<Cine | null>(null);
  const [funciones, setFunciones] = useState<Funcion[]>([]);
  const [peliculas, setPeliculas] = useState<Pelicula[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formatoSeleccionado, setFormatoSeleccionado] = useState("Todos");
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    if (!id) {
      setError("Cine no especificado.");
      setCargando(false);
      return;
    }

    setCargando(true);
    setError(null);

    Promise.all([
      cinesService.getById(id),
      funcionesService.getByCine(id),
      peliculasService.getAll(),
    ])
      .then(([cineData, funcionesData, peliculasData]) => {
        setCine(cineData);
        setFunciones(funcionesData);
        setPeliculas(peliculasData);
      })
      .catch(() => {
        setError("No se pudo cargar la información del cine o su cartelera.");
      })
      .finally(() => {
        setCargando(false);
      });
  }, [id]);

  if (cargando) {
    return (
      <div className="detalle-cine-page">
        <div className="detalle-cine-loading">
          <p>Cargando información del cine y su cartelera...</p>
        </div>
      </div>
    );
  }

  if (error || !cine) {
    return (
      <div className="detalle-cine-page">
        <div className="detalle-cine-error">
          <p>{error || "Cine no encontrado."}</p>
          <Link to="/cines" className="btn-volver-cines">
            ← Volver al listado de cines
          </Link>
        </div>
      </div>
    );
  }

  const logo = getCinemaLogo(cine);
  const esFavorito = isFavoriteCinema(cine.id);

  const handleToggleFavorito = () => {
    if (!user) {
      openAuthModal();
      return;
    }
    toggleFavoriteCinema(cine.id);
  };

  // Extrae formatos disponibles únicos
  const formatosDisponibles = funciones.reduce<string[]>(
    (acumulado, funcion) => {
      if (!acumulado.includes(funcion.formato)) {
        return [...acumulado, funcion.formato];
      }
      return acumulado;
    },
    ["Todos"],
  );

  // Filtra funciones por formato seleccionado
  const funcionesFiltradasPorFormato =
    formatoSeleccionado === "Todos"
      ? funciones
      : funciones.filter((f) => f.formato === formatoSeleccionado);

  // Agrupa por película
  const grupos = agruparFuncionesPorPelicula(
    funcionesFiltradasPorFormato,
    peliculas,
  );

  // Filtra grupos por búsqueda de título
  const gruposFiltrados = busqueda.trim()
    ? grupos.filter((g) =>
        g.pelicula.titulo.toLowerCase().includes(busqueda.trim().toLowerCase()),
      )
    : grupos;

  return (
    <div className="detalle-cine-page">
      {/* Botón superior de retorno */}
      <nav className="detalle-cine-nav">
        <Link to="/cines" className="btn-volver-cines">
          ← Volver a cines
        </Link>
      </nav>

      {/* Header / Hero del Cine */}
      <header className="detalle-cine-header">
        <div className="detalle-cine-header-main">
          <div className="detalle-cine-logo-wrap">
            {logo ? (
              <img
                src={logo}
                alt={`Logo de ${cine.nombre}`}
                className="detalle-cine-logo-img"
              />
            ) : (
              <span className="detalle-cine-fallback-icon">🎬</span>
            )}
          </div>
          <div className="detalle-cine-info">
            <p className="detalle-cine-etiqueta">Complejo cinematográfico</p>
            <h1 className="detalle-cine-nombre">{cine.nombre}</h1>
            <p className="detalle-cine-comuna">
              <MapPinIcon size={16} />
              <span>{cine.comuna}</span>
            </p>
          </div>
        </div>

        <div className="detalle-cine-header-actions">
          <button
            type="button"
            className={`btn-fav-cine-detalle ${esFavorito ? "active" : ""}`}
            onClick={handleToggleFavorito}
            title={
              esFavorito
                ? "Quitar de cines habituales"
                : "Guardar en cines habituales"
            }
          >
            <span className="corazon-icon">{esFavorito ? "♥" : "♡"}</span>
            <span>{esFavorito ? "Cine habitual" : "Guardar cine"}</span>
          </button>
        </div>
      </header>

      {/* Sección Cartelera del Cine */}
      <section className="detalle-cine-cartelera-sec">
        <div className="cartelera-sec-header">
          <div>
            <p className="subtitulo-seccion">Funciones del día</p>
            <h2>Cartelera en {cine.nombre}</h2>
          </div>
          <p className="conteo-peliculas-cine" aria-live="polite">
            {gruposFiltrados.length}{" "}
            {gruposFiltrados.length === 1 ? "película" : "películas"}
          </p>
        </div>

        {/* Filtros de la cartelera del cine */}
        {funciones.length > 0 && (
          <div className="cartelera-cine-filtros">
            {/* Buscador de película en este cine */}
            <div className="cartelera-search-box">
              <SearchIcon size={16} />
              <input
                type="text"
                placeholder="Buscar película en este cine..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              {busqueda && (
                <button
                  type="button"
                  className="btn-clear-inline"
                  onClick={() => setBusqueda("")}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Selector de formato (2D, 3D, etc.) */}
            {formatosDisponibles.length > 2 && (
              <div className="formatos-chips">
                {formatosDisponibles.map((formato) => (
                  <button
                    key={formato}
                    type="button"
                    className={`formato-chip ${formatoSeleccionado === formato ? "active" : ""}`}
                    onClick={() => setFormatoSeleccionado(formato)}
                  >
                    {formato}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Listado de películas con sus horarios */}
        {funciones.length === 0 ? (
          <div className="cartelera-cine-empty">
            <p>No hay funciones programadas para este cine en este momento.</p>
          </div>
        ) : gruposFiltrados.length === 0 ? (
          <div className="cartelera-cine-empty">
            <p>No se encontraron películas con los filtros seleccionados.</p>
            <button
              type="button"
              className="btn-reset-filtros"
              onClick={() => {
                setBusqueda("");
                setFormatoSeleccionado("Todos");
              }}
            >
              Restablecer filtros
            </button>
          </div>
        ) : (
          <div className="peliculas-cine-lista">
            {gruposFiltrados.map(({ pelicula, funciones: funcPeli }) => (
              <article key={pelicula.id} className="pelicula-cine-card">
                {/* Póster de la película */}
                <Link
                  to={`/peliculas/${pelicula.id}`}
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
                    <Link
                      to={`/peliculas/${pelicula.id}`}
                      className="pelicula-cine-titulo-link"
                    >
                      <h3>{pelicula.titulo}</h3>
                    </Link>
                    <p className="pelicula-cine-metadatos">
                      <span>{pelicula.genero}</span>
                      <span aria-hidden="true">•</span>
                      <span>{pelicula.duracion} min</span>
                      <span aria-hidden="true">•</span>
                      <span className="badge-clasif">
                        {pelicula.clasificacion}
                      </span>
                    </p>
                  </div>

                  {/* Agrupación de horarios por formato e idioma */}
                  <div className="horarios-grid-cine">
                    {funcPeli.map((func) => (
                      <div key={func.id} className="horario-pill-item">
                        <span className="horario-hora">{func.horario}</span>
                        <span className="horario-detalles">
                          {func.formato} • {func.idioma}
                        </span>
                        <span className="horario-precio">
                          ${func.precio.toLocaleString("es-CL")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default CinemaDetailPage;
