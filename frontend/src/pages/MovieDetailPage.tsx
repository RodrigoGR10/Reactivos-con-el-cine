import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useFavorites } from "../context/FavoritesContext";
import { useDetallePelicula } from "../hooks/useDetallePelicula";
import funcionService from "../services/funciones";
import { Mensaje } from "../components/common/Mensaje";
import { TarjetaFuncion } from "../components/funciones/TarjetaFuncion";
import { SelectorFechas } from "../components/funciones/SelectorFechas";
import { CloseIcon, MapPinIcon, SearchIcon } from "../components/common/Icons";
import { distanciaKM, formatearDistancia } from "../utils/distancia";
import { obtenerCadena } from "../utils/agruparCines";
import { useUbicacion } from "../hooks/useUbicacion";
import { useButacasFunciones, claveButacas } from "../hooks/useButacasFunciones";
import "./MovieDetailPage.css";

import type { Cine, Horario } from "../types/types";


function MovieDetailPage() {
    const { id } = useParams();
    const {
        toggleFavoriteCinema,
        toggleFavoriteMovie,
        isFavoriteMovie,
        isFavoriteCinema,
    } = useFavorites();
    const { user, openAuthModal } = useAuth();

    const { ubicacion, estado, solicitar } = useUbicacion();
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

    const { pelicula, horarios, cines, error } = useDetallePelicula(id);
    const butacas = useButacasFunciones();

    const [formatoSeleccionado, setFormatoSeleccionado] = useState("Todos");
    const [fechaSeleccionada, setFechaSeleccionada] = useState("");
    const [busqueda, setBusqueda] = useState("");
    const [comunaSeleccionada, setComunaSeleccionada] = useState("Todas");
    const [cadenaSeleccionada, setCadenaSeleccionada] = useState("");
    const [consultandoPrecios, setConsultandoPrecios] = useState<Record<string, boolean>>({});
    const [horariosConPrecios, setHorariosConPrecios] = useState<Record<string, Horario>>({});

    const fechasDisponibles = [
        ...new Set(horarios.map((horario) => horario.fecha)),
    ].sort();
    const fechaActual = fechasDisponibles.includes(fechaSeleccionada)
        ? fechaSeleccionada
        : (fechasDisponibles[0] ?? "");
    const horariosDelDia = horarios.filter(
        (horario) => horario.fecha === fechaActual,
    );

    const handleConsultarPreciosCine = async (cineId: string) => {
        if (!id || !fechaActual || consultandoPrecios[cineId]) return;

        setConsultandoPrecios((prev) => ({ ...prev, [cineId]: true }));
        try {
            const nuevosHorarios = await funcionService.getPrecios(
                id,
                cineId,
                fechaActual,
            );
            setHorariosConPrecios((prev) => {
                const next = { ...prev };
                for (const h of nuevosHorarios) {
                    next[h.id] = h;
                }
                return next;
            });
        } catch (err) {
            console.error("Error al consultar precios del cine:", err);
        } finally {
            setConsultandoPrecios((prev) => ({ ...prev, [cineId]: false }));
        }
    };

    const formatosDisponibles = [
        "Todos",
        ...new Set(
            horariosDelDia.map((horario) => horario.formatoResumen || "2D"),
        ),
    ];
    const formatoActual = formatosDisponibles.includes(formatoSeleccionado)
        ? formatoSeleccionado
        : "Todos";

    const grupos = cines
        .flatMap((cine) => {
            const sesiones = horariosDelDia
                .map((h) => ({ ...(horariosConPrecios[h.id] ?? h), ...butacas.porHorario[h.id] }))
                .filter(
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
                : Number(isFavoriteCinema(b.cine.id)) - Number(isFavoriteCinema(a.cine.id));
            return prioridad
                || a.cine.nombre.localeCompare(b.cine.nombre, "es-CL", { sensitivity: "base", numeric: true })
                || a.cine.id.localeCompare(b.cine.id);
        });

    const comunasDisponibles = [
        "Todas",
        ...new Set(
            cines
                .filter((cine) =>
                    horariosDelDia.some((h) => h.cineId === cine.id),
                )
                .map((cine) => cine.comuna)
                .filter(Boolean),
        ),
    ].sort((a, b) =>
        a === "Todas" ? -1 : b === "Todas" ? 1 : a.localeCompare(b),
    );

    const comunaActual = comunasDisponibles.includes(comunaSeleccionada)
        ? comunaSeleccionada
        : "Todas";

    const cadenasDisponibles = [...new Map(grupos.map(({ cine }) => {
        const cadena = obtenerCadena(cine);
        return [cadena.id, cadena] as const;
    })).values()].sort((a, b) => a.nombre.localeCompare(b.nombre, "es-CL"));
    const cadenaActual = cadenasDisponibles.some((cadena) => cadena.id === cadenaSeleccionada)
        ? cadenaSeleccionada
        : "";

    const gruposFiltrados = grupos.filter((g) => {
        const coincideBusqueda =
            !busqueda.trim() ||
            g.cine.nombre.toLowerCase().includes(busqueda.trim().toLowerCase()) ||
            g.cine.comuna.toLowerCase().includes(busqueda.trim().toLowerCase());

        const coincideComuna =
            comunaActual === "Todas" ||
            g.cine.comuna.toLowerCase() === comunaActual.toLowerCase();

        const coincideCadena = !cadenaActual || obtenerCadena(g.cine).id === cadenaActual;

        return coincideBusqueda && coincideComuna && coincideCadena;
    });

    if (error) return <Mensaje texto={error} />;
    if (!pelicula) return <Mensaje texto="Cargando película..." />;

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
                        <span aria-hidden="true">•</span>
                        <span>{pelicula.duracion} min</span>
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

                {/* Filtros de la cartelera: Fila principal y Formatos */}
                {horarios.length > 0 && (
                    <div className="cartelera-cine-filtros">
                        <div className="filtros-barra-principal">
                            <div className="cartelera-search-box">
                                <SearchIcon size={16} />
                                <input
                                    type="text"
                                    aria-label="Buscar por cine o comuna"
                                    placeholder="Buscar por cine o comuna..."
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                />
                                {busqueda && (
                                    <button
                                        type="button"
                                        className="btn-clear-inline"
                                        aria-label="Borrar búsqueda"
                                        title="Borrar búsqueda"
                                        onClick={() => setBusqueda("")}
                                    >
                                        <CloseIcon size={14} />
                                    </button>
                                )}
                            </div>

                            <select
                                className="selector-cadena-filtro"
                                value={cadenaActual}
                                onChange={(e) => setCadenaSeleccionada(e.target.value)}
                                aria-label="Filtrar por cadena"
                                disabled={cadenasDisponibles.length === 0}
                            >
                                <option value="">Todas las cadenas</option>
                                {cadenasDisponibles.map((cadena) => (
                                    <option key={cadena.id} value={cadena.id}>
                                        {cadena.nombre}
                                    </option>
                                ))}
                            </select>

                            {comunasDisponibles.length > 1 && (
                                <select
                                    className="selector-comuna-filtro"
                                    value={comunaActual}
                                    onChange={(e) => setComunaSeleccionada(e.target.value)}
                                    aria-label="Filtrar por comuna"
                                >
                                    <option value="Todas">Todas las comunas</option>
                                    {comunasDisponibles
                                        .filter((c) => c !== "Todas")
                                        .map((comuna) => (
                                            <option key={comuna} value={comuna}>
                                                {comuna}
                                            </option>
                                        ))}
                                </select>
                            )}

                            {grupos.length > 0 && (
                                <button
                                    type="button"
                                    className={`boton-cercania-detalle ${ordenarPorCercania ? "activo" : ""}`}
                                    aria-pressed={ordenarPorCercania}
                                    title={ordenarPorCercania ? "Volver al orden por favoritos" : "Ordenar por cercanía"}
                                    onClick={() => {
                                        if (ordenarPorCercania) {
                                            setCercaniaActiva(false);
                                            return;
                                        }
                                        setCercaniaActiva(true);
                                        solicitar();
                                    }}
                                    disabled={estado === "cargando"}
                                >
                                    <MapPinIcon size={15} />
                                    <span>
                                        {estado === "cargando"
                                            ? "Ubicando..."
                                            : "Cerca de mí"}
                                    </span>
                                </button>
                            )}
                        </div>

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
                                setComunaSeleccionada("Todas");
                                setFormatoSeleccionado("Todos");
                                setCadenaSeleccionada("");
                            }}
                        >
                            Restablecer filtros
                        </button>
                    </div>
                ) : (
                    <>
                        {estado === "denegado" && (
                            <p className="aviso-cercania">
                                No pudimos acceder a tu ubicación. Habilita el
                                permiso en tu navegador para ordenar por
                                cercanía.
                            </p>
                        )}
                        {estado === "error" && (
                            <p className="aviso-cercania">
                                No se pudo obtener tu ubicación. Intenta
                                nuevamente.
                            </p>
                        )}
                        <div className="lista-cines">
                            {gruposFiltrados.map(
                                ({ cine, horarios: sesiones, distancia }) => {
                                    const estaConsultando = Boolean(
                                        consultandoPrecios[cine.id],
                                    );
                                    const tienePrecios = sesiones.some(
                                        (h) =>
                                            h.tarifas?.length &&
                                            (h.tarifas[0].precioOnline ||
                                                h.tarifas[0].precio),
                                    );
                                    const clave = claveButacas(pelicula.id, cine.id, fechaActual);
                                    const tieneButacas = sesiones.some(h => h.butacas || h.estadoButacas === "sin_datos");

                                    return (
                                        <article
                                            key={cine.id}
                                            className="tarjeta-cine"
                                        >
                                            <div className="cabecera-cine">
                                                <div className="cabecera-cine-left">
                                                    <div
                                                        className="logo-cine"
                                                        data-origen={cine.origen}
                                                    >
                                                        <button
                                                            type="button"
                                                            className="boton-fav-cine"
                                                            onClick={() => {
                                                                if (!user) {
                                                                    openAuthModal();
                                                                    return;
                                                                }
                                                                toggleFavoriteCinema(
                                                                    cine.id,
                                                                );
                                                            }}
                                                            title={
                                                                isFavoriteCinema(cine.id)
                                                                    ? "Quitar de cines favoritos"
                                                                    : "Guardar en cines favoritos"
                                                            }
                                                        >
                                                            {isFavoriteCinema(cine.id)
                                                                ? "♥"
                                                                : "♡"}
                                                        </button>
                                                        {cine.logo ? (
                                                            <img
                                                                src={cine.logo}
                                                                alt={`Logo de ${cine.nombre}`}
                                                            />
                                                        ) : (
                                                            <span>🎬</span>
                                                        )}
                                                    </div>

                                                    <div className="nombre-cine">
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
                                                        <span>
                                                            {cine.comuna} ·{" "}
                                                            {sesiones.length}{" "}
                                                            {sesiones.length === 1
                                                                ? "horario"
                                                                : "horarios"}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="funciones-acciones">
                                                <button
                                                    type="button"
                                                    className={`btn-ver-precios ${tienePrecios ? "cargado" : ""}`}
                                                    disabled={estaConsultando}
                                                    onClick={() =>
                                                        handleConsultarPreciosCine(
                                                            cine.id,
                                                        )
                                                    }
                                                    title={
                                                        tienePrecios
                                                            ? "Actualizar precios de este cine"
                                                            : "Consultar precios en tiempo real"
                                                    }
                                                >
                                                    {estaConsultando
                                                        ? "Consultando..."
                                                        : tienePrecios
                                                          ? "Precios cargados"
                                                          : "Ver precios"}
                                                </button>
                                                <button type="button" className="btn-ver-butacas"
                                                    disabled={butacas.cargando[clave]}
                                                    aria-label={`Consultar butacas en ${cine.nombre}`}
                                                    title="Consultar disponibilidad de butacas de estas funciones"
                                                    onClick={() => butacas.consultar(pelicula.id, cine.id, fechaActual)}>
                                                    {butacas.cargando[clave] ? "Consultando butacas..." : tieneButacas ? "Actualizar butacas" : "Ver butacas"}
                                                </button>
                                                </div>
                                            </div>
                                            {butacas.errores[clave] && <p className="error-butacas" role="alert">{butacas.errores[clave]}</p>}
                                            <div className="horarios-grid-cine">
                                                {sesiones.map((h) => (
                                                    <TarjetaFuncion
                                                        key={h.id}
                                                        horario={h}
                                                        pelicula={pelicula}
                                                        cine={cine}
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
