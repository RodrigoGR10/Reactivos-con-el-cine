import { Link } from "react-router-dom";
import { useState, useEffect, useId } from "react";
import { Skeleton } from "@mantine/core";
import { useAuth } from "../context/AuthContext";
import { useFavorites } from "../context/FavoritesContext";
import type { Pelicula, Cine } from "../types/types";
import {
  SearchIcon,
  FilmIcon,
  MapPinIcon,
  CalendarIcon,
  PencilIcon,
} from "../components/common/Icons";
import {
  TarjetaCine,
  TarjetaCineSkeleton,
} from "../components/cines/TarjetaCine";
import { Mensaje } from "../components/common/Mensaje";
import peliculasService from "../services/peliculas";
import cinesService from "../services/cines";
import { normalizarTexto } from "../utils/normalizarTexto";
import "./ProfilePage.css";

const POSTERS_ESQUELETO = [0, 1, 2, 3, 4, 5];
const CINES_ESQUELETO = [0, 1, 2, 3];

/** Formatea la fecha de registro dinámicamente en español */
const formatearFechaRegistro = (fechaStr?: string): string => {
  const fecha = fechaStr ? new Date(fechaStr) : new Date();
  const textoFecha = new Intl.DateTimeFormat("es-CL", {
    month: "long",
    year: "numeric",
  }).format(fecha);

  return `se unió en ${textoFecha}`;
};

type TabType = "peliculas" | "cines";

const ProfilePage = () => {
  const { user, openAuthModal } = useAuth();
  const {
    favoriteMovieIds,
    favoriteCinemaIds,
    toggleFavoriteMovie,
    toggleFavoriteCinema,
  } = useFavorites();

  const [tabActiva, setTabActiva] = useState<TabType>("peliculas");
  const [busqueda, setBusqueda] = useState("");
  const [modoEdicion, setModoEdicion] = useState(false);
  const [peliculas, setPeliculas] = useState<Pelicula[]>([]);
  const [cines, setCines] = useState<Cine[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchInputId = useId();

  // Consulta la API mediante servicios en paralelo con Promise.all
  useEffect(() => {
    let activo = true;
    Promise.all([peliculasService.getAll(), cinesService.getAll()])
      .then(([peliculasData, cinesData]) => {
        if (!activo) return;
        setPeliculas(peliculasData);
        setCines(cinesData);
      })
      .catch(() => {
        if (activo) setError("No se pudieron cargar los datos del catálogo.");
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  const peliculasFavoritas = peliculas.filter((p) =>
    favoriteMovieIds.includes(p.id),
  );
  const cinesFavoritos = cines.filter((c) => favoriteCinemaIds.includes(c.id));

  const hayGuardadosEnTab =
    tabActiva === "peliculas"
      ? peliculasFavoritas.length > 0
      : cinesFavoritos.length > 0;
  const editando = modoEdicion && hayGuardadosEnTab;

  // Buscador solo aparece si hay >14 items (evita UI innecesaria en listas cortas)
  const mostrarBuscador =
    tabActiva === "peliculas"
      ? peliculasFavoritas.length > 14
      : cinesFavoritos.length > 14;

  const query = mostrarBuscador ? normalizarTexto(busqueda.trim()) : "";

  const peliculasGuardadasFiltradas = query
    ? peliculasFavoritas.filter((p) =>
        normalizarTexto(p.titulo).includes(query),
      )
    : peliculasFavoritas;

  const cinesGuardadosFiltrados = query
    ? cinesFavoritos.filter(
        (c) =>
          normalizarTexto(c.nombre).includes(query) ||
          normalizarTexto(c.comuna).includes(query),
      )
    : cinesFavoritos;

  return (
    <>
      <div className="main-content">
        <section className="profile-header">
          <div className="profile-header-left">
            <div className="profile-avatar-lg">
              <img
                src={user ? "/default-avatar.png" : "/guest-avatar.png"}
                alt={user ? user.nombre : "mi perfil"}
                className="avatar-img"
              />
            </div>
            <div className="profile-user-info">
              <h1 className="profile-user-name">
                {user ? user.nombre : "mi perfil"}
              </h1>
              {user ? (
                <p className="profile-user-joined">
                  <CalendarIcon size={14} className="calendar-icon-inline" />
                  <span>{formatearFechaRegistro(user.fechaRegistro)}</span>
                </p>
              ) : (
                <button
                  type="button"
                  className="btn-guest-login"
                  onClick={openAuthModal}
                >
                  iniciar sesión
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="middle-nav-row">
          <div className="tabs-group">
            <button
              type="button"
              className={`tab-link ${tabActiva === "peliculas" ? "active" : ""}`}
              aria-pressed={tabActiva === "peliculas"}
              onClick={() => {
                setTabActiva("peliculas");
                setBusqueda("");
                setModoEdicion(false);
              }}
            >
              películas guardadas
            </button>
            <button
              type="button"
              className={`tab-link ${tabActiva === "cines" ? "active" : ""}`}
              aria-pressed={tabActiva === "cines"}
              onClick={() => {
                setTabActiva("cines");
                setBusqueda("");
                setModoEdicion(false);
              }}
            >
              cines habituales
            </button>
          </div>

          <div className="actions-group">
            {mostrarBuscador && (
              <div className="search-box-minimal">
                <label htmlFor={searchInputId} className="visualmente-oculto">
                  {tabActiva === "cines" ? "Buscar cines" : "Buscar guardados"}
                </label>
                <SearchIcon size={16} />
                <input
                  id={searchInputId}
                  type="search"
                  placeholder={
                    tabActiva === "cines" ? "Buscar cines..." : "Buscar guardados..."
                  }
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>
            )}
            {user && hayGuardadosEnTab && (
              <button
                type="button"
                className={`btn-edit-minimal ${editando ? "active" : ""}`}
                onClick={() => setModoEdicion((prev) => !prev)}
                aria-label={editando ? "Finalizar edición" : "Editar guardados"}
                aria-pressed={editando}
                title={editando ? "Finalizar edición" : "Editar guardados"}
              >
                <span className="btn-edit-text">
                  {editando ? "listo" : "editar"}
                </span>
                <PencilIcon size={16} className="btn-edit-icon" />
              </button>
            )}
          </div>
        </section>

        {cargando ? (
          <div className="content-area" role="status" aria-busy="true">
            <span className="visualmente-oculto">Cargando favoritos...</span>
            {tabActiva === "cines" ? (
              <div className="cines-grid">
                {CINES_ESQUELETO.map((idx) => (
                  <TarjetaCineSkeleton key={idx} />
                ))}
              </div>
            ) : (
              <div className="posters-grid">
                {POSTERS_ESQUELETO.map((idx) => (
                  <div
                    key={idx}
                    className="poster-card-skeleton"
                    aria-hidden="true"
                  >
                    <Skeleton height="100%" radius={0} />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : error ? (
          <div className="content-area">
            <Mensaje
              tipo="error"
              embebido
              titulo="Error al cargar favoritos"
              texto={error}
            />
          </div>
        ) : (
          <>
            {tabActiva === "peliculas" && (
              <div className="content-area">
                {peliculasFavoritas.length === 0 ? (
                  <div className="empty-state-ultra">
                    <div className="empty-icon-wrap">
                      <FilmIcon size={36} />
                    </div>
                    {user ? (
                      <>
                        <h2>tu lista de películas está vacía</h2>
                        <p>
                          guarda películas desde la cartelera para tenerlas a
                          mano al ir al cine.
                        </p>
                      </>
                    ) : (
                      <p>
                        inicia sesión para ver o guardar tus películas
                        favoritas.
                      </p>
                    )}
                  </div>
                ) : peliculasGuardadasFiltradas.length === 0 ? (
                  <div className="empty-state-ultra">
                    <div className="empty-icon-wrap">
                      <SearchIcon size={34} className="empty-state-svg" />
                    </div>
                    <h2>sin resultados para "{busqueda}"</h2>
                    <p>
                      no tienes ninguna película guardada que coincida con tu
                      búsqueda.
                    </p>
                  </div>
                ) : (
                  <div className="posters-grid">
                    {peliculasGuardadasFiltradas.map((peli) => {
                      const contenidoPoster = peli.poster ? (
                        <img
                          src={peli.poster}
                          alt={peli.titulo}
                          className="poster-img"
                          loading="lazy"
                        />
                      ) : (
                        <div className="poster-placeholder" aria-hidden="true">
                          <span className="icono-pelicula">🎬</span>
                          <small>{peli.titulo}</small>
                        </div>
                      );

                      return (
                        <article
                          key={peli.id}
                          className={`poster-card ${editando ? "editing" : ""}`}
                          title={peli.titulo}
                        >
                          {editando ? (
                            contenidoPoster
                          ) : (
                            <Link
                              to={`/peliculas/${peli.id}`}
                              aria-label={peli.titulo}
                            >
                              {contenidoPoster}
                            </Link>
                          )}

                          {editando && (
                            <div className="poster-edit-overlay">
                              <button
                                type="button"
                                className="btn-poster-remove"
                                onClick={() => toggleFavoriteMovie(peli.id)}
                                aria-label={`Eliminar ${peli.titulo} de mis películas`}
                                title={`Eliminar ${peli.titulo} de mis películas`}
                              >
                                <span aria-hidden="true">✕</span>
                              </button>
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {tabActiva === "cines" && (
              <div className="content-area">
                {cinesFavoritos.length === 0 ? (
                  <div className="empty-state-ultra">
                    <div className="empty-icon-wrap">
                      <MapPinIcon size={36} className="empty-state-svg" />
                    </div>
                    {user ? (
                      <>
                        <h2>no tienes cines guardados</h2>
                        <p>
                          guarda tus complejos frecuentes para consultar
                          horarios de forma directa.
                        </p>
                      </>
                    ) : (
                      <p>
                        inicia sesión para guardar tus complejos frecuentes.
                      </p>
                    )}
                  </div>
                ) : cinesGuardadosFiltrados.length === 0 ? (
                  <div className="empty-state-ultra">
                    <div className="empty-icon-wrap">
                      <SearchIcon size={34} className="empty-state-svg" />
                    </div>
                    <h2>sin resultados para "{busqueda}"</h2>
                    <p>
                      no tienes ningún cine habitual que coincida con tu
                      búsqueda.
                    </p>
                  </div>
                ) : (
                  <div className="cines-grid">
                    {cinesGuardadosFiltrados.map((cine) => (
                      <TarjetaCine
                        key={cine.id}
                        cine={cine}
                        nivelTitulo="h2"
                        navegable={!editando}
                        accion={
                          editando ? (
                            <button
                              type="button"
                              className="btn-cinema-toggle remove"
                              onClick={() => toggleFavoriteCinema(cine.id)}
                              title={`Eliminar ${cine.nombre} de cines habituales`}
                            >
                              eliminar{" "}
                              <span className="visualmente-oculto">
                                {cine.nombre}
                              </span>
                              <span aria-hidden="true">✕</span>
                            </button>
                          ) : undefined
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default ProfilePage;
