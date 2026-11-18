import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
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
import BuscadorPeliculas from "../components/peliculas/BuscadorPeliculas";
import { TrailerPelicula } from "../components/peliculas/TrailerPelicula";
import { obtenerFormatosDisponibles } from "../utils/agruparFunciones";
import { distanciaKM, formatearDistancia } from "../utils/distancia";
import {
    filtrarCines,
    obtenerCadenas,
    obtenerComunas,
    obtenerLogoCine,
} from "../utils/agruparCines";
import { useUbicacion } from "../hooks/useUbicacion";
import {
    useDetalleFunciones,
    claveDetalle,
} from "../hooks/useDetalleFunciones";
import "./MovieDetailPage.css";

import type { Cine } from "../types/types";

const CINES_DETALLE_ESQUELETO = [0, 1];
const HORARIOS_ESQUELETO = [0, 1, 2];

function MovieDetailPage() {
    const { id } = useParams();
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
    const [fechaSeleccionada, setFechaSeleccionada] = useState("");
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
        ).map((c) => c.id),
    );

    const gruposFiltrados = grupos.filter((g) =>
        cinesFiltradosIds.has(g.cine.id),
    );

    const chipsFiltros: ChipFiltroActivo[] = [
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
                <section className="hero-detalle" aria-hidden="true">
                    <div className="poster-detalle poster-detalle-skeleton">
                        <Skeleton height="100%" radius={0} />
                    </div>
                    <div className="contenido-detalle">
                        <Skeleton width={160} height={14} radius="sm" />
                        <Skeleton width="68%" height={48} radius="md" mt={10} mb={18} />
                        <div className="metadatos-detalle">
                            <Skeleton width={46} height={26} radius={6} />
                            <Skeleton width={110} height={18} radius="sm" />
                            <Skeleton width={68} height={18} radius="sm" />
                            <Skeleton height={34} circle />
                        </div>
                        <Skeleton width="100%" height={16} radius="sm" mb={10} />
                        <Skeleton width="92%" height={16} radius="sm" mb={10} />
                        <Skeleton width="64%" height={16} radius="sm" />
                    </div>
                </section>

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

    return (
        <div className="detalle-pelicula">
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
                    <p className="subtitulo-seccion">
                        Información de la película
                    </p>

                    <h1>{pelicula.titulo}</h1>

                    <div className="metadatos-detalle">
                        <span>{pelicula.clasificacion}</span>
                        <span aria-hidden="true">•</span>
                        <span>{pelicula.genero}</span>
                        {pelicula.duracion !== null && (
                            <>
                                <span aria-hidden="true">•</span>
                                <span>{pelicula.duracion} min</span>
                            </>
                        )}
                        <button
                            type="button"
                            className={`boton-fav-peli ${isFavoriteMovie(pelicula.id) ? "activo" : ""}`}
                            title={
                                isFavoriteMovie(pelicula.id)
                                    ? "Quitar de películas favoritas"
                                    : "Guardar en películas favoritas"
                            }
                            onClick={() => {
                                if (!user) {
                                    openAuthModal();
                                    return;
                                }
                                toggleFavoriteMovie(pelicula.id);
                            }}
                        >
                            {isFavoriteMovie(pelicula.id) ? "♥" : "♡"}
                        </button>
                    </div>

                    <p className="sinopsis-detalle">{pelicula.sinopsis}</p>
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
                        setFechaSeleccionada(fecha);
                        setFormatoSeleccionado("Todos");
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
                                label="Buscar por cine o comuna"
                                placeholder="Buscar por cine o comuna..."
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

                                    const logoCine = obtenerLogoCine(cine);

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
                                                        <div
                                                            className="logo-cine"
                                                            data-origen={cine.origen}
                                                        >
                                                            {logoCine ? (
                                                                <img
                                                                    src={logoCine}
                                                                    alt=""
                                                                />
                                                            ) : (
                                                                <span>🎬</span>
                                                            )}
                                                        </div>
                                                    </Link>

                                                    <div className="nombre-cine">
                                                        <strong>
                                                            <Link
                                                                to={`/cines/${cine.id}`}
                                                                className="enlace-cine-detalle"
                                                            >
                                                                {cine.nombre}
                                                            </Link>
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
