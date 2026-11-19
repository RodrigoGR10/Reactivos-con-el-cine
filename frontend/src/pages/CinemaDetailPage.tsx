import { useState, useEffect } from "react";
import axios from "axios";
import { useParams, Link } from "react-router-dom";
import { Skeleton } from "@mantine/core";
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
  GrupoFiltros,
  SelectorUnico,
  type ChipFiltroActivo,
} from "../components/common/SelectorMultiple";
import { useEsMovilFiltros } from "../hooks/useEsMovilFiltros";
import BuscadorPeliculas from "../components/peliculas/BuscadorPeliculas";
import {
  agruparHorariosPorPelicula,
  horarioCoincideIdioma,
  obtenerFormatosDisponibles,
  obtenerIdiomasDisponibles,
} from "../utils/agruparFunciones";
import { normalizarTexto } from "../utils/normalizarTexto";
import { LogoCine } from "../components/cines/LogoCine";
import { TarjetaFuncion } from "../components/funciones/TarjetaFuncion";
import { BotonDetalleFunciones } from "../components/funciones/BotonDetalleFunciones";
import { SelectorFechas } from "../components/funciones/SelectorFechas";
import "./CinemaDetailPage.css";
import {
  useDetalleFunciones,
  claveDetalle,
} from "../hooks/useDetalleFunciones";


const HORARIOS_VACIOS: Horario[] = [];
const PELICULAS_CINE_ESQUELETO = [0, 1];
const HORARIOS_CINE_ESQUELETO = [0, 1, 2];

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
  const [idiomaSeleccionado, setIdiomaSeleccionado] = useState("Todos");
  const [busqueda, setBusqueda] = useState("");
  const esMovil = useEsMovilFiltros();
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
      <div className="detalle-cine-page" role="status" aria-busy="true">
        <span className="visualmente-oculto">
          Cargando información del cine y su cartelera...
        </span>
        <nav className="detalle-cine-nav">
          <Link to="/cines" className="btn-volver-cines">
            ← Volver a cines
          </Link>
        </nav>

        <header className="detalle-cine-header" aria-hidden="true">
          <div className="detalle-cine-header-main">
            <Skeleton width={84} height={84} radius={16} style={{ flexShrink: 0 }} />
            <div className="detalle-cine-info">
              <Skeleton width={150} height={13} radius="sm" maw="100%" />
              <Skeleton width={240} height={32} radius="sm" maw="100%" />
              <Skeleton width={190} height={16} radius="sm" maw="100%" />
            </div>
          </div>
          <div className="detalle-cine-header-actions">
            <Skeleton width={152} height={44} radius={10} />
          </div>
        </header>

        <section className="detalle-cine-cartelera-sec" aria-hidden="true">
          <div className="cartelera-sec-header">
            <div>
              <Skeleton width={140} height={13} radius="sm" mb={6} />
              <Skeleton width={220} height={26} radius="sm" maw="100%" />
            </div>
            <Skeleton width={88} height={30} radius={20} />
          </div>

          <div className="fechas-skeleton-row">
            <Skeleton width={92} height={54} radius={10} />
            <Skeleton width={92} height={54} radius={10} />
          </div>

          <div className="peliculas-cine-lista">
            {PELICULAS_CINE_ESQUELETO.map((idx) => (
              <div key={idx} className="pelicula-cine-card">
                <Skeleton width={110} height={165} radius={10} className="pelicula-cine-poster-skeleton" style={{ flexShrink: 0 }} />
                <div className="pelicula-cine-content">
                  <div className="pelicula-cine-header-info">
                    <div className="pelicula-cine-header-text">
                      <Skeleton width={210} height={24} radius="sm" mb={8} maw="100%" />
                      <Skeleton width={150} height={16} radius="sm" maw="100%" />
                    </div>
                    <Skeleton width={136} height={36} radius={8} />
                  </div>
                  <div className="horarios-grid-cine">
                    {HORARIOS_CINE_ESQUELETO.map((hIdx) => (
                      <Skeleton
                        key={hIdx}
                        width={108}
                        height={58}
                        radius={10}
                        style={{ flexShrink: 0 }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
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

  // Extrae formatos e idiomas disponibles únicos y sus conteos para el día seleccionado
  const opcionesFormato = obtenerFormatosDisponibles(horariosDelDia);
  const formatosDisponibles = ["Todos", ...opcionesFormato.map((f) => f.valor)];

  const formatoActual = formatosDisponibles.includes(formatoSeleccionado)
    ? formatoSeleccionado
    : "Todos";

  const opcionesIdioma = obtenerIdiomasDisponibles(horariosDelDia);
  const idiomasDisponibles = ["Todos", ...opcionesIdioma.map((i) => i.valor)];

  const idiomaActual = idiomasDisponibles.includes(idiomaSeleccionado)
    ? idiomaSeleccionado
    : "Todos";

  const hayFiltrosDesplegables =
    opcionesFormato.length > 1 || opcionesIdioma.length > 1;

  const chipsFiltros: ChipFiltroActivo[] = [
    ...(formatoActual !== "Todos"
      ? [
          {
            id: `formato-${formatoActual}`,
            etiqueta: formatoActual,
            ariaLabel: `Quitar filtro de formato: ${formatoActual}`,
            onQuitar: () => setFormatoSeleccionado("Todos"),
          },
        ]
      : []),
    ...(idiomaActual !== "Todos"
      ? [
          {
            id: `idioma-${idiomaActual}`,
            etiqueta: idiomaActual,
            ariaLabel: `Quitar filtro de idioma: ${idiomaActual}`,
            onQuitar: () => setIdiomaSeleccionado("Todos"),
          },
        ]
      : []),
  ];

  // Filtra horarios por formato e idioma seleccionados
  const horariosFiltrados = horariosDelDia.filter(
    (h) =>
      (formatoActual === "Todos" ||
        (h.formatoResumen || "2D") === formatoActual) &&
      horarioCoincideIdioma(h, idiomaActual),
  );

  // Agrupa por película y prioriza las películas favoritas al entrar a la vista
  const grupos = agruparHorariosPorPelicula(
    horariosFiltrados,
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
          <LogoCine cine={cine} tamano="lg" />
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
            setIdiomaSeleccionado("Todos");
          }}
        />

        {/* Filtros de la cartelera del cine */}
        {horarios.length > 0 && (
          <div className="cartelera-cine-filtros">
            <div
              className={`herramientas-cartelera ${esMovil && hayFiltrosDesplegables ? "herramientas-cartelera--movil" : ""}`.trim()}
            >
              <BuscadorPeliculas
                busqueda={busqueda}
                onBusquedaChange={setBusqueda}
                label="Buscar película en este cine"
                placeholder="Buscar película en este cine..."
              />
              {hayFiltrosDesplegables && (
                <div className="filtros-cartelera-selectores">
                  <GrupoFiltros cantidadActivos={chipsFiltros.length}>
                    {opcionesFormato.length > 1 && (
                      <SelectorUnico
                        className="filtro-formato"
                        opciones={opcionesFormato}
                        seleccionada={
                          formatoActual === "Todos" ? "" : formatoActual
                        }
                        onChange={(valor) =>
                          setFormatoSeleccionado(valor || "Todos")
                        }
                        titulo="Formato"
                        etiquetaVacia="Formato"
                        ariaLabelPrefijo="Filtrar por formato"
                      />
                    )}
                    {opcionesIdioma.length > 1 && (
                      <SelectorUnico
                        className="filtro-idioma"
                        opciones={opcionesIdioma}
                        seleccionada={
                          idiomaActual === "Todos" ? "" : idiomaActual
                        }
                        onChange={(valor) =>
                          setIdiomaSeleccionado(valor || "Todos")
                        }
                        titulo="Idioma"
                        etiquetaVacia="Idioma"
                        ariaLabelPrefijo="Filtrar por idioma"
                      />
                    )}
                  </GrupoFiltros>
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
                setIdiomaSeleccionado("Todos");
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
                        <div className="pelicula-cine-titulo">
                          <h3>
                            <Link
                              to={`/peliculas/${pelicula.id}`}
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
                              toggleFavoriteMovie(pelicula.id);
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
                              {pelicula.genero && <span aria-hidden="true">•</span>}
                              <span>{pelicula.duracion} min</span>
                            </>
                          )}
                          {(pelicula.genero || pelicula.duracion !== null) && (
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
