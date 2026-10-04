import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import type { Cine } from "../types/types";
import cinesService from "../services/cines";
import { useAuth } from "../context/AuthContext";
import { useFavorites } from "../context/FavoritesContext";
import { SearchIcon, MapPinIcon } from "../components/common/Icons";
import "./CinemasPage.css";

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

function CinemasPage() {
  const { user, openAuthModal } = useAuth();
  const { isFavoriteCinema, toggleFavoriteCinema } = useFavorites();

  const [cines, setCines] = useState<Cine[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [comunaSeleccionada, setComunaSeleccionada] = useState("Todas");

  useEffect(() => {
    cinesService
      .getAll()
      .then((data) => {
        setCines(data);
      })
      .catch(() => {
        setError("No se pudieron cargar los cines. Intenta nuevamente.");
      })
      .finally(() => {
        setCargando(false);
      });
  }, []);

  const comunas = [
    "Todas",
    ...Array.from(new Set(cines.map((c) => c.comuna))).sort(),
  ];

  const cinesFiltrados = cines.filter((cine) => {
    const termino = busqueda.trim().toLowerCase();
    const coincideNombreOComuna =
      cine.nombre.toLowerCase().includes(termino) ||
      cine.comuna.toLowerCase().includes(termino);
    const coincideComuna =
      comunaSeleccionada === "Todas" ||
      cine.comuna.toLowerCase() === comunaSeleccionada.toLowerCase();

    return coincideNombreOComuna && coincideComuna;
  });

  const hayFiltrosActivos =
    busqueda.trim() !== "" || comunaSeleccionada !== "Todas";

  const limpiarFiltros = () => {
    setBusqueda("");
    setComunaSeleccionada("Todas");
  };

  return (
    <div className="cines-page">
      <header className="cines-header">
        <div className="cines-header-title">
          <p className="cines-subtitulo">Directorio de salas</p>
          <h1>Cines y Complejos</h1>
        </div>
        {!cargando && !error && (
          <span className="cines-contador">
            {cinesFiltrados.length}{" "}
            {cinesFiltrados.length === 1 ? "complejo" : "complejos"}
          </span>
        )}
      </header>

      <section className="cines-filtros-bar" aria-label="Búsqueda y filtros de cines">
        <div className="cines-search-box">
          <SearchIcon size={18} />
          <input
            type="text"
            placeholder="Buscar por cine o comuna..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          {busqueda && (
            <button
              type="button"
              className="cines-btn-clear-search"
              onClick={() => setBusqueda("")}
              title="Borrar búsqueda"
            >
              ✕
            </button>
          )}
        </div>

        <div className="cines-comunas-selector">
          <label htmlFor="comuna-select">Comuna:</label>
          <select
            id="comuna-select"
            value={comunaSeleccionada}
            onChange={(e) => setComunaSeleccionada(e.target.value)}
          >
            {comunas.map((comuna) => (
              <option key={comuna} value={comuna}>
                {comuna === "Todas" ? "Todas las comunas" : comuna}
              </option>
            ))}
          </select>
        </div>

        {hayFiltrosActivos && (
          <button
            type="button"
            className="cines-btn-limpiar"
            onClick={limpiarFiltros}
          >
            Limpiar filtros
          </button>
        )}
      </section>

      {cargando ? (
        <div className="cines-loading">
          <p>Cargando complejos cinematográficos...</p>
        </div>
      ) : error ? (
        <div className="cines-error">
          <p>{error}</p>
        </div>
      ) : cinesFiltrados.length === 0 ? (
        <div className="cines-empty">
          <h3>No se encontraron cines</h3>
          <p>
            No hay ningún complejo que coincida con los filtros seleccionados.
          </p>
          <button
            type="button"
            className="cines-btn-limpiar-empty"
            onClick={limpiarFiltros}
          >
            Restablecer búsqueda
          </button>
        </div>
      ) : (
        <div className="cines-grid">
          {cinesFiltrados.map((cine) => {
            const logo = getCinemaLogo(cine);
            const esFavorito = isFavoriteCinema(cine.id);

            return (
              <article key={cine.id} className="cine-card">
                <div className="cine-card-header">
                  <div className="cine-logo-container">
                    {logo ? (
                      <img
                        src={logo}
                        alt={`Logo de ${cine.nombre}`}
                        className="cine-card-logo"
                      />
                    ) : (
                      <span className="cine-card-fallback-icon">🎬</span>
                    )}
                  </div>
                  <button
                    type="button"
                    className={`cine-btn-fav ${esFavorito ? "active" : ""}`}
                    title={
                      esFavorito
                        ? "Quitar de cines habituales"
                        : "Guardar en cines habituales"
                    }
                    onClick={() => {
                      if (!user) {
                        openAuthModal();
                        return;
                      }
                      toggleFavoriteCinema(cine.id);
                    }}
                  >
                    {esFavorito ? "♥" : "♡"}
                  </button>
                </div>

                <div className="cine-card-body">
                  <h2 className="cine-card-nombre">{cine.nombre}</h2>
                  <p className="cine-card-comuna">
                    <MapPinIcon size={14} />
                    <span>{cine.comuna}</span>
                  </p>
                </div>

                <div className="cine-card-footer">
                  <Link
                    to={`/cines/${cine.id}`}
                    className="cine-btn-ver-cartelera"
                  >
                    Ver cartelera y funciones
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default CinemasPage;
