import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import type { Cine, Pelicula, Horario } from "../types/types";
import cinesService from "../services/cines";
import funcionesService from "../services/funciones";
import peliculasService from "../services/peliculas";
import { useAuth } from "../context/AuthContext";
import { useFavorites } from "../context/FavoritesContext";
import { MapPinIcon, SearchIcon } from "../components/common/Icons";
import { agruparHorariosPorPelicula } from "../utils/agruparFunciones";
import { TarjetaFuncion } from "../components/funciones/TarjetaFuncion";
import "./CinemaDetailPage.css";

const mostrarFecha = (fecha: string) =>
  new Intl.DateTimeFormat("es-CL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${fecha}T12:00:00Z`));

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
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [peliculas, setPeliculas] = useState<Pelicula[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fechaSeleccionada, setFechaSeleccionada] = useState("");
  const [formatoSeleccionado, setFormatoSeleccionado] = useState("Todos");
  const [busqueda, setBusqueda] = useState("");
  const [consultandoPrecios, setConsultandoPrecios] = useState<Record<string, boolean>>({});

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
      funcionesService.getHorariosByCine(id),
      peliculasService.getAll(),
    ])
      .then(([cineData, horariosData, peliculasData]) => {
        setCine(cineData);
        setHorarios(horariosData);
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

  const handleConsultarPreciosPelicula = async (peliculaId: string) => {
    if (!cine?.id || !fechaActual || consultandoPrecios[peliculaId]) return;

    setConsultandoPrecios((prev) => ({ ...prev, [peliculaId]: true }));
    try {
      const nuevosHorarios = await funcionesService.getPrecios(
        peliculaId,
        cine.id,
        fechaActual,
      );
      const mapaNuevos = new Map(nuevosHorarios.map((h) => [h.id, h]));
      setHorarios((prev) => prev.map((h) => mapaNuevos.get(h.id) ?? h));
    } catch (error) {
      console.error("Error al consultar precios de la película:", error);
    } finally {
      setConsultandoPrecios((prev) => ({ ...prev, [peliculaId]: false }));
    }
  };

  // Fechas disponibles ordenadas
  const fechasDisponibles = [
    ...new Set(horarios.map((h) => h.fecha).filter(Boolean)),
  ].sort();
  const fechaActual = fechasDisponibles.includes(fechaSeleccionada)
    ? fechaSeleccionada
    : (fechasDisponibles[0] ?? "");

  const horariosDelDia = fechaActual
    ? horarios.filter((h) => h.fecha === fechaActual)
    : horarios;

  // Extrae formatos disponibles únicos para el día seleccionado
  const formatosDisponibles = horariosDelDia.reduce<string[]>(
    (acumulado, horario) => {
      const formato = horario.formatoResumen || "2D";
      if (!acumulado.includes(formato)) {
        return [...acumulado, formato];
      }
      return acumulado;
    },
    ["Todos"],
  );

  const formatoActual = formatosDisponibles.includes(formatoSeleccionado)
    ? formatoSeleccionado
    : "Todos";

  // Filtra horarios por formato seleccionado
  const horariosFiltradosPorFormato =
    formatoActual === "Todos"
      ? horariosDelDia
      : horariosDelDia.filter(
          (h) => (h.formatoResumen || "2D") === formatoActual,
        );

  // Agrupa por película
  const grupos = agruparHorariosPorPelicula(
    horariosFiltradosPorFormato,
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
              <span>
                {cine.direccion
                  ? `${cine.direccion} (${cine.comuna})`
                  : cine.comuna}
              </span>
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
            <p className="subtitulo-seccion">Funciones disponibles</p>
            <h2>Cartelera en {cine.nombre}</h2>
          </div>
          <p className="conteo-peliculas-cine" aria-live="polite">
            {gruposFiltrados.length}{" "}
            {gruposFiltrados.length === 1 ? "película" : "películas"}
          </p>
        </div>

        {/* Selector de fechas */}
        {fechasDisponibles.length > 1 && (
          <div className="formatos-chips" style={{ marginBottom: "14px" }}>
            {fechasDisponibles.map((fecha) => (
              <button
                key={fecha}
                type="button"
                className={`formato-chip ${fechaActual === fecha ? "active" : ""}`}
                onClick={() => {
                  setFechaSeleccionada(fecha);
                  setFormatoSeleccionado("Todos");
                }}
              >
                {mostrarFecha(fecha)}
              </button>
            ))}
          </div>
        )}

        {/* Filtros de la cartelera del cine */}
        {horarios.length > 0 && (
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
                    className={`formato-chip ${formatoActual === formato ? "active" : ""}`}
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
        {horarios.length === 0 ? (
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
            {gruposFiltrados.map(({ pelicula, horarios: horariosPeli }) => {
              const estaConsultando = Boolean(consultandoPrecios[pelicula.id]);
              const tienePrecios = horariosPeli.some(
                (h) => h.tarifas?.length && (h.tarifas[0].precioOnline || h.tarifas[0].precio),
              );

              return (
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
                      <div className="pelicula-cine-header-text">
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
                      <button
                        type="button"
                        className={`btn-ver-precios ${tienePrecios ? "cargado" : ""}`}
                        disabled={estaConsultando}
                        onClick={() => handleConsultarPreciosPelicula(pelicula.id)}
                        title={
                          tienePrecios
                            ? "Actualizar precios de esta película"
                            : "Consultar precios en tiempo real"
                        }
                      >
                        {estaConsultando
                          ? "Consultando..."
                          : tienePrecios
                            ? "Precios cargados"
                            : "Ver precios"}
                      </button>
                    </div>

                    {/* Agrupación de horarios con TarjetaFuncion */}
                    <div className="horarios-grid-cine">
                      {horariosPeli.map((h) => (
                        <TarjetaFuncion
                          key={h.id}
                          horario={h}
                          pelicula={pelicula}
                          cine={cine}
                        />
                      ))}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default CinemaDetailPage;
