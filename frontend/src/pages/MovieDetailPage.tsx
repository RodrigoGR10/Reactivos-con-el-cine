import { Fragment, useState, useEffect } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { Skeleton } from "@mantine/core";
import { useAuth } from "../context/AuthContext";
import { useFavorites } from "../context/FavoritesContext";
import { useFavoritosAlEntrar } from "../hooks/useFavoritosAlEntrar";
import { useDetallePelicula } from "../hooks/useDetallePelicula";
import { AvisoUbicacion, Mensaje } from "../components/common/Mensaje";
import { BotonFavorito } from "../components/common/BotonFavorito";
import { TarjetaFuncion } from "../components/funciones/TarjetaFuncion";
import { BotonDetalleFunciones } from "../components/funciones/BotonDetalleFunciones";
import { SelectorFechas } from "../components/funciones/SelectorFechas";
import {
    BotonCercania,
    ChipsFiltrosActivos,
    GrupoFiltros,
    SelectorMultiple,
    SelectorUnico,
    type ChipFiltroActivo,
} from "../components/common/SelectorMultiple";
import { useEsMovilFiltros } from "../hooks/useEsMovilFiltros";
import { SelectorComunas } from "../components/cines/SelectorComunas";
import { LogoCine } from "../components/cines/LogoCine";
import BuscadorPeliculas from "../components/peliculas/BuscadorPeliculas";
import { SinopsisExpandible } from "../components/peliculas/SinopsisExpandible";
import { TrailerPelicula } from "../components/peliculas/TrailerPelicula";
import { CalendarIcon, HeartIcon } from "../components/common/Icons";
import {
    formatearFechaEstrenoCompacta,
    formatearFechaEstrenoCorta,
} from "../utils/formatearPeliculaDestacada";
import { obtenerFormatosDisponibles } from "../utils/agruparFunciones";
import { distanciaKM, formatearDistancia } from "../utils/distancia";
import {
    filtrarCines,
    obtenerCadenas,
    obtenerComunas,
} from "../utils/agruparCines";
import { useUbicacion } from "../hooks/useUbicacion";
import {
    useDetalleFunciones,
    claveDetalle,
} from "../hooks/useDetalleFunciones";
import "./MovieDetailPage.css";

import type { Cine, Pelicula } from "../types/types";

const CINES_DETALLE_ESQUELETO = [0, 1];
const HORARIOS_ESQUELETO = [0, 1, 2];
const OPCIONES_ACTUALIZACION_FILTRO = {
    replace: true,
    preventScrollReset: true,
} as const;
const ETIQUETAS_ESTRENO: Record<
    NonNullable<Pelicula["estadoEstreno"]>,
    string
> = {
    cartelera: "En cartelera",
    preventa: "Preventa",
    proximamente: "Próximamente",
};

function MovieDetailPage() {
    const { id } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const fechaSeleccionada = searchParams.get("fecha") ?? "";
    const cineSeleccionadoId = searchParams.get("cineId") ?? "";
    const {
        toggleFavoriteCinema,
        toggleFavoriteMovie,
        isFavoriteMovie,
        isFavoriteCinema,
    } = useFavorites();
    const { cinesFavoritosAlEntrar } = useFavoritosAlEntrar();
    const { user, openAuthModal } = useAuth();

    const { ubicacion, estado, solicitar, descartarAviso } = useUbicacion();
    const [cercaniaActiva, setCercaniaActiva] = useState(false);
    const ordenarPorCercania = cercaniaActiva && estado === "listo" && ubicacion !== null;

    const distanciaA = (cine: Cine) =>
        ordenarPorCercania && ubicacion && cine.latitud != null && cine.longitud != null
            ? distanciaKM(
                  ubicacion.latitud,
                  ubicacion.longitud,
                  cine.latitud,
                  cine.longitud,
              )
            : Infinity;

    const { pelicula, horarios, cines, error, noEncontrada } = useDetallePelicula(id);
    const detalle = useDetalleFunciones();

    const [formatoSeleccionado, setFormatoSeleccionado] = useState("Todos");
    const [busqueda, setBusqueda] = useState("");
    const [comunasSeleccionadas, setComunasSeleccionadas] = useState<string[]>([]);
    const [cadenasSeleccionadas, setCadenasSeleccionadas] = useState<string[]>([]);
    const esMovil = useEsMovilFiltros();

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
            ".detalle-pelicula .horarios-grid-cine",
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
    }, [
        horarios,
        cines,
        fechaSeleccionada,
        formatoSeleccionado,
        busqueda,
        comunasSeleccionadas,
        cadenasSeleccionadas,
    ]);

    const fechasDisponibles = [
        ...new Set(horarios.map((horario) => horario.fecha)),
    ].sort();
    const fechaActual = fechasDisponibles.includes(fechaSeleccionada)
        ? fechaSeleccionada
        : (fechasDisponibles[0] ?? "");
    const horariosDelDia = horarios.filter(
        (horario) => horario.fecha === fechaActual,
    );

    const opcionesFormato = obtenerFormatosDisponibles(horariosDelDia);
    const formatosDisponibles = ["Todos", ...opcionesFormato.map((f) => f.valor)];
    const formatoActual = formatosDisponibles.includes(formatoSeleccionado)
        ? formatoSeleccionado
        : "Todos";

    const grupos = cines
        .flatMap((cine) => {
            const sesiones = horariosDelDia.filter(
                (h) =>
                    h.cineId === cine.id &&
                    (formatoActual === "Todos" ||
                        (h.formatoResumen || "2D") === formatoActual),
            );

            return sesiones.length
                ? [{ cine, horarios: sesiones, distancia: distanciaA(cine) }]
                : [];
        })
        .sort((a, b) => {
            const prioridad = ordenarPorCercania
                ? a.distancia === b.distancia ? 0 : a.distancia - b.distancia
                : Number(cinesFavoritosAlEntrar.has(b.cine.id)) - Number(cinesFavoritosAlEntrar.has(a.cine.id));
            return prioridad
                || a.cine.nombre.localeCompare(b.cine.nombre, "es-CL", { sensitivity: "base", numeric: true })
                || a.cine.id.localeCompare(b.cine.id);
        });

    const cinesDelDia = cines.filter((cine) =>
        horariosDelDia.some((h) => h.cineId === cine.id),
    );
    const comunasDisponibles = obtenerComunas(cinesDelDia);
    const valoresComunasDisponibles = new Set(comunasDisponibles.map((c) => c.valor));
    const comunasActivas = comunasSeleccionadas.filter((valor) =>
        valoresComunasDisponibles.has(valor),
    );

    const cadenasDisponibles = obtenerCadenas(grupos.map((g) => g.cine));
    const valoresCadenasDisponibles = new Set(cadenasDisponibles.map((c) => c.valor));
    const cadenasActivas = cadenasSeleccionadas.filter((valor) =>
        valoresCadenasDisponibles.has(valor),
    );

    const cinesFiltradosIds = new Set(
        filtrarCines(
            grupos.map((g) => g.cine),
            busqueda,
            comunasActivas,
            cadenasActivas,
        )
            .filter((cine) => !cineSeleccionadoId || cine.id === cineSeleccionadoId)
            .map((cine) => cine.id),
    );

    const gruposFiltrados = grupos.filter((g) =>
        cinesFiltradosIds.has(g.cine.id),
    );

    const cineSeleccionado = cines.find((cine) => cine.id === cineSeleccionadoId);

    const chipsFiltros: ChipFiltroActivo[] = [
        ...(cineSeleccionado
            ? [{
                  id: `cine-${cineSeleccionado.id}`,
                  etiqueta: cineSeleccionado.nombre,
                  ariaLabel: `Quitar filtro ${cineSeleccionado.nombre}`,
                  onQuitar: () => setSearchParams((anteriores) => {
                      const siguientes = new URLSearchParams(anteriores);
                      siguientes.delete("cineId");
                      siguientes.delete("funcionId");
                      siguientes.delete("hora");
                      return siguientes;
                  }, OPCIONES_ACTUALIZACION_FILTRO),
              }]
            : []),
        ...cadenasDisponibles
            .filter((cadena) => cadenasActivas.includes(cadena.valor))
            .map((cadena) => ({
                id: `cadena-${cadena.valor}`,
                etiqueta: cadena.nombre,
                ariaLabel: `Quitar filtro ${cadena.nombre}`,
                onQuitar: () =>
                    setCadenasSeleccionadas((anteriores) =>
                        anteriores.filter((valor) => valor !== cadena.valor),
                    ),
            })),
        ...comunasDisponibles
            .filter((comuna) => comunasActivas.includes(comuna.valor))
            .map((comuna) => ({
                id: `comuna-${comuna.valor}`,
                etiqueta: comuna.nombre,
                ariaLabel: `Quitar filtro ${comuna.nombre}`,
                onQuitar: () =>
                    setComunasSeleccionadas((anteriores) =>
                        anteriores.filter((valor) => valor !== comuna.valor),
                    ),
            })),
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
    ];

    if (error) {
        return (
            <Mensaje
                tipo="error"
                titulo={
                    noEncontrada
                        ? "Película no encontrada"
                        : "Error al cargar la película"
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
        return (
            <div className="detalle-pelicula" role="status" aria-busy="true">
                <span className="visualmente-oculto">Cargando película...</span>
                <nav className="detalle-pelicula-nav">
                    <Link to="/" className="btn-volver-cartelera">
                        ← Volver a cartelera
                    </Link>
                </nav>
                <section className="hero-detalle" aria-hidden="true">
                    <div className="poster-detalle poster-detalle-skeleton">
                        <Skeleton height="100%" radius={0} />
                    </div>
                    <div className="contenido-detalle">
                        <div className="detalle-estado-fila">
                            <Skeleton width={110} height={14} radius="sm" />
                        </div>
                        <Skeleton width="68%" height={40} radius="md" mb={14} />
                        <div className="metadatos-detalle">
                            <Skeleton width={110} height={18} radius="sm" />
                            <Skeleton width={68} height={18} radius="sm" />
                            <Skeleton width={46} height={24} radius={4} />
                        </div>
                        <Skeleton width="100%" height={16} radius="sm" mb={10} />
                        <Skeleton width="92%" height={16} radius="sm" mb={10} />
                        <Skeleton width="64%" height={16} radius="sm" />
                        <div className="acciones-detalle">
                            <Skeleton width={132} height={42} radius={10} />
                        </div>
                    </div>
                </section>

                <Skeleton height={48} radius={8} mb={36} />

                <section className="seccion-funciones" aria-hidden="true">
                    <div className="encabezado-funciones">
                        <div>
                            <Skeleton width={120} height={13} radius="sm" mb={6} />
                            <Skeleton width={140} height={26} radius="sm" />
                        </div>
                        <Skeleton width={76} height={30} radius={20} />
                    </div>

                    <div className="fechas-skeleton-row">
                        <Skeleton width={92} height={54} radius={10} />
                        <Skeleton width={92} height={54} radius={10} />
                    </div>

                    <div className="lista-cines">
                        {CINES_DETALLE_ESQUELETO.map((idx) => (
                            <div key={idx} className="tarjeta-cine">
                                <div className="cabecera-cine">
                                    <div className="cabecera-cine-left">
                                        <Skeleton width={58} height={58} radius={10} style={{ flexShrink: 0 }} />
                                        <div className="nombre-cine">
                                            <Skeleton width={190} height={22} radius="sm" maw="100%" />
                                            <Skeleton width={130} height={15} radius="sm" maw="100%" />
                                        </div>
                                    </div>
                                    <Skeleton width={136} height={36} radius={8} />
                                </div>
                                <div className="horarios-grid-cine">
                                    {HORARIOS_ESQUELETO.map((hIdx) => (
                                        <Skeleton
                                            key={hIdx}
                                            width={116}
                                            height={58}
                                            radius={10}
                                            style={{ flexShrink: 0 }}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        );
    }

    const estadoEstreno = pelicula.estadoEstreno ?? "cartelera";
    const etiquetaEstado = ETIQUETAS_ESTRENO[estadoEstreno];
    const mostrarFechaEstreno =
        (estadoEstreno === "preventa" || estadoEstreno === "proximamente") &&
        Boolean(pelicula.fechaEstreno);
    const esFavorita = isFavoriteMovie(pelicula.id);
    const metadatos = [
        pelicula.genero ? { clave: "genero", contenido: pelicula.genero } : null,
        pelicula.duracion !== null && pelicula.duracion > 0
            ? { clave: "duracion", contenido: `${pelicula.duracion} min` }
            : null,
        pelicula.clasificacion
            ? {
                  clave: "clasificacion",
                  contenido: pelicula.clasificacion,
                  className: "metadato-clasificacion",
              }
            : null,
    ].filter((item) => item !== null);

    return (
        <div className="detalle-pelicula">
            <nav className="detalle-pelicula-nav">
                <Link to="/" className="btn-volver-cartelera">
                    ← Volver a cartelera
                </Link>
            </nav>

            <section className="hero-detalle">
                <div className="poster-detalle">
                    {pelicula.poster ? (
                        <img
                            src={pelicula.poster}
                            alt={`Póster de ${pelicula.titulo}`}
                        />
                    ) : (
                        <div className="poster-detalle-placeholder">🎬</div>
                    )}
                </div>

                <div className="contenido-detalle">
                    <div className="detalle-estado-fila">
                        <p className="subtitulo-seccion">{etiquetaEstado}</p>
                        {mostrarFechaEstreno && pelicula.fechaEstreno && (
                            <span className="detalle-estado-fecha">
                                <CalendarIcon
                                    size={14}
                                    className="detalle-estado-icono"
                                />
                                <time dateTime={pelicula.fechaEstreno}>
                                    <span className="fecha-detalle-larga">
                                        {formatearFechaEstrenoCorta(
                                            pelicula.fechaEstreno,
                                        )}
                                    </span>
                                    <span className="fecha-detalle-corta">
                                        {formatearFechaEstrenoCompacta(
                                            pelicula.fechaEstreno,
                                        )}
                                    </span>
                                </time>
                            </span>
                        )}
                    </div>

                    <h1>{pelicula.titulo}</h1>

                    {metadatos.length > 0 && (
                        <div className="metadatos-detalle">
                            {metadatos.map((item, indice) => (
                                <Fragment key={item.clave}>
                                    {indice > 0 && (
                                        <span
                                            className="metadato-separador"
                                            aria-hidden="true"
                                        >
                                            •
                                        </span>
                                    )}
                                    <span className={item.className}>
                                        {item.contenido}
                                    </span>
                                </Fragment>
                            ))}
                        </div>
                    )}

                    <SinopsisExpandible
                        key={pelicula.id}
                        texto={pelicula.sinopsis}
                    />

                    <div className="acciones-detalle">
                        <button
                            type="button"
                            className={`boton-fav-detalle${esFavorita ? " activo" : ""}`}
                            aria-pressed={esFavorita}
                            aria-label={
                                esFavorita
                                    ? `Quitar ${pelicula.titulo} de Mi lista`
                                    : `Guardar ${pelicula.titulo} en Mi lista`
                            }
                            title={
                                esFavorita
                                    ? "Quitar de Mi lista"
                                    : "Guardar en Mi lista"
                            }
                            onClick={() => {
                                if (!user) {
                                    openAuthModal();
                                    return;
                                }
                                toggleFavoriteMovie(pelicula.id);
                            }}
                        >
                            <HeartIcon
                                size={16}
                                filled={esFavorita}
                                className="icono-fav-detalle"
                            />
                            <span>{esFavorita ? "En Mi lista" : "Mi lista"}</span>
                        </button>
                    </div>
                </div>
            </section>

            <TrailerPelicula pelicula={pelicula} />

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
                        {gruposFiltrados.length}{" "}
                        {gruposFiltrados.length === 1 ? "cine" : "cines"}
                    </p>
                </div>

                {/* Selector de fechas */}
                <SelectorFechas
                    fechas={fechasDisponibles}
                    fechaSeleccionada={fechaActual}
                    onSeleccionarFecha={(fecha) => {
                        setFormatoSeleccionado("Todos");
                        setSearchParams((anteriores) => {
                            const siguientes = new URLSearchParams(anteriores);
                            siguientes.set("fecha", fecha);
                            siguientes.delete("funcionId");
                            siguientes.delete("hora");
                            return siguientes;
                        }, OPCIONES_ACTUALIZACION_FILTRO);
                    }}
                />

                {/* Filtros de la cartelera */}
                {horarios.length > 0 && (
                    <div className="cartelera-cine-filtros">
                        <div
                            className={`herramientas-cartelera ${esMovil ? "herramientas-cartelera--movil" : ""}`.trim()}
                        >
                            <BuscadorPeliculas
                                busqueda={busqueda}
                                onBusquedaChange={setBusqueda}
                                label="Buscar cines"
                                placeholder="Buscar cines..."
                            />
                            <div className="filtros-cartelera-selectores">
                                <GrupoFiltros
                                    cantidadActivos={chipsFiltros.length}
                                    disabled={
                                        cadenasDisponibles.length === 0 &&
                                        comunasDisponibles.length === 0 &&
                                        opcionesFormato.length <= 1
                                    }
                                >
                                    <SelectorMultiple
                                        className="cines-cadenas-selector"
                                        posicion="bottom-start"
                                        opciones={cadenasDisponibles}
                                        seleccionadas={cadenasActivas}
                                        onChange={setCadenasSeleccionadas}
                                        titulo="Cadenas"
                                        etiquetaTodas="Cadenas"
                                        etiquetaPlural="cadenas"
                                        etiquetaSingular="1 cadena"
                                        ariaLabelPrefijo="Filtrar por cadenas"
                                        disabled={cadenasDisponibles.length === 0}
                                    />

                                    {comunasDisponibles.length > 0 && (
                                        <SelectorComunas
                                            opciones={comunasDisponibles}
                                            seleccionadas={comunasActivas}
                                            onChange={setComunasSeleccionadas}
                                        />
                                    )}

                                    {opcionesFormato.length > 1 && (
                                        <SelectorUnico
                                            className="filtro-formato"
                                            opciones={opcionesFormato}
                                            seleccionada={formatoActual === "Todos" ? "" : formatoActual}
                                            onChange={(valor) => setFormatoSeleccionado(valor || "Todos")}
                                            titulo="Formato"
                                            etiquetaVacia="Formato"
                                            ariaLabelPrefijo="Filtrar por formato"
                                        />
                                    )}
                                </GrupoFiltros>

                                {grupos.length > 0 && (
                                    <BotonCercania
                                        activo={ordenarPorCercania}
                                        cargando={estado === "cargando"}
                                        compacto={esMovil}
                                        tituloInactivo="Ordenar por cercanía"
                                        onToggle={() => {
                                            if (ordenarPorCercania) {
                                                setCercaniaActiva(false);
                                                return;
                                            }
                                            setCercaniaActiva(true);
                                            solicitar();
                                        }}
                                    />
                                )}
                            </div>
                        </div>
                        <ChipsFiltrosActivos chips={chipsFiltros} ariaLabel="Filtros seleccionados" />
                    </div>
                )}

                {grupos.length === 0 ? (
                    <div className="sin-funciones">
                        <span aria-hidden="true">🎬</span>
                        <p>No hay funciones vigentes para esta fecha.</p>
                    </div>
                ) : gruposFiltrados.length === 0 ? (
                    <div className="sin-funciones">
                        <span aria-hidden="true">🎬</span>
                        <p>No se encontraron cines con los filtros seleccionados.</p>
                        <button
                            type="button"
                            className="btn-reset-filtros"
                            onClick={() => {
                                setBusqueda("");
                                setComunasSeleccionadas([]);
                                setFormatoSeleccionado("Todos");
                                setCadenasSeleccionadas([]);
                                setSearchParams((anteriores) => {
                                    const siguientes = new URLSearchParams(anteriores);
                                    siguientes.delete("cineId");
                                    siguientes.delete("funcionId");
                                    siguientes.delete("hora");
                                    return siguientes;
                                }, OPCIONES_ACTUALIZACION_FILTRO);
                            }}
                        >
                            Restablecer filtros
                        </button>
                    </div>
                ) : (
                    <>
                        <AvisoUbicacion
                            estado={estado}
                            onCerrar={descartarAviso}
                            className="detalle-aviso-ubicacion"
                        />
                        <div className="lista-cines">
                            {gruposFiltrados.map(
                                ({ cine, horarios: sesiones, distancia }) => {
                                    const clave = claveDetalle(pelicula.id, cine.id, fechaActual);
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

                                    return (
                                        <article
                                            key={cine.id}
                                            className="tarjeta-cine"
                                        >
                                            <div className="cabecera-cine">
                                                <div className="cabecera-cine-left">
                                                    <Link
                                                        to={`/cines/${cine.id}`}
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
                                                                    className="enlace-cine-detalle"
                                                                >
                                                                    {cine.nombre}
                                                                </Link>
                                                                {Number.isFinite(
                                                                    distancia,
                                                                ) && (
                                                                    <span className="distancia-cine">
                                                                        {formatearDistancia(
                                                                            distancia,
                                                                        )}
                                                                    </span>
                                                                )}
                                                            </strong>
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
                                                    consultadoEn={estadoDetalle.consultadoEn}
                                                    avisoError={estadoDetalle.avisoError}
                                                    contexto={cine.nombre}
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
                                                        horario={detalle.horarioParaTarjeta(h, clave)}
                                                        pelicula={pelicula}
                                                        cine={cine}
                                                        mostrarDetalle={estadoDetalle.revelado}
                                                    />
                                                ))}
                                            </div>
                                        </article>
                                    );
                                },
                            )}
                        </div>
                    </>
                )}
            </section>
        </div>
    );
}

export default MovieDetailPage;
