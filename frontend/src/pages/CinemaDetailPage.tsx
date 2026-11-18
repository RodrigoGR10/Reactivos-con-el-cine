import { useState, useEffect } from "react";
import axios from "axios";
import { useParams, Link } from "react-router-dom";
import { Mensaje } from "../components/common/Mensaje";
import type { Cine, Pelicula, Horario } from "../types/types";
import cinesService from "../services/cines";
import funcionesService from "../services/funciones";
import peliculasService from "../services/peliculas";
import { useAuth } from "../context/AuthContext";
import { useFavorites } from "../context/FavoritesContext";
import { useFavoritosAlEntrar } from "../hooks/useFavoritosAlEntrar";
import { MapPinIcon } from "../components/common/Icons";
import { BotonFavorito } from "../components/common/BotonFavorito";
import {
  ChipsFiltrosActivos,
  SelectorUnico,
  type ChipFiltroActivo,
} from "../components/common/SelectorMultiple";
import BuscadorPeliculas from "../components/peliculas/BuscadorPeliculas";
import {
  agruparHorariosPorPelicula,
  obtenerFormatosDisponibles,
} from "../utils/agruparFunciones";
import { normalizarTexto } from "../utils/normalizarTexto";
import { TarjetaFuncion } from "../components/funciones/TarjetaFuncion";
import { BotonDetalleFunciones } from "../components/funciones/BotonDetalleFunciones";
import { SelectorFechas } from "../components/funciones/SelectorFechas";
import "./CinemaDetailPage.css";
import {
  useDetalleFunciones,
  claveDetalle,
} from "../hooks/useDetalleFunciones";


const HORARIOS_VACIOS: Horario[] = [];

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
  const {
    isFavoriteCinema,
    toggleFavoriteCinema,
    isFavoriteMovie,
    toggleFavoriteMovie,
  } = useFavorites();
  const { peliculasFavoritasAlEntrar } = useFavoritosAlEntrar();

  const [cineEstado, setCineEstado] = useState<Cine | null>(null);
  const [horariosEstado, setHorariosEstado] = useState<Horario[]>([]);
  const [peliculasEstado, setPeliculasEstado] = useState<Pelicula[]>([]);
  const [idCargado, setIdCargado] = useState<string>();
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [noEncontradoCarga, setNoEncontradoCarga] = useState(false);
  const [fechaSeleccionada, setFechaSeleccionada] = useState("");
  const [formatoSeleccionado, setFormatoSeleccionado] = useState("Todos");
  const [busqueda, setBusqueda] = useState("");
  const detalle = useDetalleFunciones();

  useEffect(() => {
    if (!id) return;
    let cancelado = false;

    Promise.all([
      cinesService.getById(id),
      funcionesService.getHorariosByCine(id),
      peliculasService.getAll(),
    ])
      .then(([cineData, horariosData, peliculasData]) => {
        if (cancelado) return;
        setErrorCarga(null);
        setNoEncontradoCarga(false);
        setCineEstado(cineData);
        setHorariosEstado(horariosData);
        setPeliculasEstado(peliculasData);
        setIdCargado(id);
      })
      .catch((err: unknown) => {
        if (cancelado) return;
        const es404 = axios.isAxiosError(err) && err.response?.status === 404;
        setCineEstado(null);
        setNoEncontradoCarga(es404);
        setErrorCarga(
          es404
            ? "El cine que buscas no existe o ya no está disponible."
            : "No se pudo cargar la información del cine o su cartelera.",
        );
        setIdCargado(id);
      });

    return () => {
      cancelado = true;
    };
  }, [id]);

  const cargando = Boolean(id && idCargado !== id);
  const cine = id && idCargado === id ? cineEstado : null;
  const horarios = id && idCargado === id ? horariosEstado : HORARIOS_VACIOS;
  const peliculas = id && idCargado === id ? peliculasEstado : [];
  const noEncontrado = !id || (idCargado === id && noEncontradoCarga);
  const error = id
    ? idCargado === id
      ? errorCarga
      : null
    : "El cine que buscas no existe o ya no está disponible.";

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof CSS === "undefined" ||
      CSS.supports("animation-timeline", "scroll()") ||
      typeof IntersectionObserver === "undefined"
    ) {
      return;
    }

    const observers: IntersectionObserver[] = [];
    for (const scroller of document.querySelectorAll<HTMLElement>(
      ".detalle-cine-page .horarios-grid-cine",
    )) {
      const first = scroller.firstElementChild;
      const last = scroller.lastElementChild;
      if (!first || !last) continue;

      const observer = new IntersectionObserver(
        (entries) => {
          for (const { target, intersectionRatio } of entries) {
            scroller.classList.toggle(
              target === first ? "more-start" : "more-end",
              intersectionRatio < 1,
            );
          }
        },
        { root: scroller, threshold: 1, rootMargin: "1px" },
      );

      observer.observe(first);
      observer.observe(last);
      observers.push(observer);
    }

    return () => {
      for (const observer of observers) observer.disconnect();
    };
  }, [horarios, fechaSeleccionada, formatoSeleccionado, busqueda, cargando]);

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
      <Mensaje
        tipo="error"
        titulo={noEncontrado || !cine ? "Cine no encontrado" : "Error al cargar el cine"}
        texto={error || "El cine que buscas no existe o ya no está disponible."}
        accion={
          <Link to="/cines" className="mensaje-accion-link">
            ← Volver al listado de cines
          </Link>
        }
      />
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

  // Extrae formatos disponibles únicos y sus conteos para el día seleccionado
  const opcionesFormato = obtenerFormatosDisponibles(horariosDelDia);
  const formatosDisponibles = ["Todos", ...opcionesFormato.map((f) => f.valor)];

  const formatoActual = formatosDisponibles.includes(formatoSeleccionado)
    ? formatoSeleccionado
    : "Todos";

  const chipsFiltros: ChipFiltroActivo[] =
    formatoActual !== "Todos"
      ? [
          {
            id: `formato-${formatoActual}`,
            etiqueta: formatoActual,
            ariaLabel: `Quitar filtro de formato: ${formatoActual}`,
            onQuitar: () => setFormatoSeleccionado("Todos"),
          },
        ]
      : [];

  // Filtra horarios por formato seleccionado
  const horariosFiltradosPorFormato =
    formatoActual === "Todos"
      ? horariosDelDia
      : horariosDelDia.filter(
          (h) => (h.formatoResumen || "2D") === formatoActual,
        );

  // Agrupa por película y prioriza las películas favoritas al entrar a la vista
  const grupos = agruparHorariosPorPelicula(
    horariosFiltradosPorFormato,
    peliculas,
  ).sort(
    (a, b) =>
      Number(peliculasFavoritasAlEntrar.has(b.pelicula.id)) -
      Number(peliculasFavoritasAlEntrar.has(a.pelicula.id)),
  );

  // Filtra grupos por búsqueda de título
  const terminoBusqueda = normalizarTexto(busqueda.trim());
  const gruposFiltrados = terminoBusqueda
    ? grupos.filter((g) =>
        normalizarTexto(g.pelicula.titulo).includes(terminoBusqueda),
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
          <div className="detalle-cine-logo-wrap" data-origen={cine.origen}>
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
        <SelectorFechas
          fechas={fechasDisponibles}
          fechaSeleccionada={fechaActual}
          onSeleccionarFecha={(fecha) => {
            setFechaSeleccionada(fecha);
            setFormatoSeleccionado("Todos");
          }}
        />

        {/* Filtros de la cartelera del cine */}
        {horarios.length > 0 && (
          <div className="cartelera-cine-filtros">
            <div className="herramientas-cartelera">
              <BuscadorPeliculas
                busqueda={busqueda}
                onBusquedaChange={setBusqueda}
                label="Buscar película en este cine"
                placeholder="Buscar película en este cine..."
              />
              {opcionesFormato.length > 1 && (
                <div className="filtros-cartelera-selectores">
                  <SelectorUnico
                    className="filtro-formato"
                    opciones={opcionesFormato}
                    seleccionada={formatoActual === "Todos" ? "" : formatoActual}
                    onChange={(valor) => setFormatoSeleccionado(valor || "Todos")}
                    titulo="Formato"
                    etiquetaVacia="Formato"
                    ariaLabelPrefijo="Filtrar por formato"
                  />
                </div>
              )}
            </div>
            <ChipsFiltrosActivos chips={chipsFiltros} />
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
                        <h3>
                          <Link
                            to={`/peliculas/${pelicula.id}`}
                            className="pelicula-cine-titulo-link"
                          >
                            {pelicula.titulo}
                          </Link>
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
                              toggleFavoriteMovie(pelicula.id);
                            }}
                          />
                        </h3>
                        <p className="pelicula-cine-metadatos">
                          <span>{pelicula.genero}</span>
                          {pelicula.duracion !== null && (
                            <>
                              <span aria-hidden="true">•</span>
                              <span>{pelicula.duracion} min</span>
                            </>
                          )}
                          <span aria-hidden="true">•</span>
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
                          horario={detalle.horarioParaTarjeta(h, clave)}
                          pelicula={pelicula}
                          cine={cine}
                          mostrarDetalle={estadoDetalle.revelado}
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
