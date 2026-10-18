import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useFavorites } from "../context/FavoritesContext";
import { useDetallePelicula } from "../hooks/useDetallePelicula";
import funcionService from "../services/funciones";
import { Mensaje } from "../components/common/Mensaje";
import { TarjetaFuncion } from "../components/funciones/TarjetaFuncion";
import { MapPinIcon } from "../components/common/Icons";
import { distanciaKM, formatearDistancia } from "../utils/distancia";
import { useUbicacion } from "../hooks/useUbicacion";
import "./MovieDetailPage.css";

import type { Cine, Horario } from "../types/types";

const mostrarFecha = (fecha: string) =>
    new Intl.DateTimeFormat("es-CL", {
        weekday: "short",
        day: "numeric",
        month: "short",
        timeZone: "UTC",
    }).format(new Date(`${fecha}T12:00:00Z`));

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

    const distanciaA = (cine: Cine) =>
        ubicacion && cine.latitud != null && cine.longitud != null
            ? distanciaKM(
                  ubicacion.latitud,
                  ubicacion.longitud,
                  cine.latitud,
                  cine.longitud,
              )
            : Infinity;

    const { pelicula, horarios, cines, error } = useDetallePelicula(id);

    const [formatoSeleccionado, setFormatoSeleccionado] = useState("Todos");
    const [fechaSeleccionada, setFechaSeleccionada] = useState("");
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
                .map((h) => horariosConPrecios[h.id] ?? h)
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
        .sort((a, b) =>
            a.distancia === b.distancia
                ? a.cine.nombre.localeCompare(b.cine.nombre)
                : a.distancia - b.distancia,
        );

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

                    <div className="filtros-funciones">
                        {fechasDisponibles.length > 0 && (
                            <div className="filtro-formato">
                                <label htmlFor="fecha-funcion">Fecha</label>
                                <select
                                    id="fecha-funcion"
                                    value={fechaActual}
                                    onChange={(e) => {
                                        setFechaSeleccionada(e.target.value);
                                        setFormatoSeleccionado("Todos");
                                    }}
                                >
                                    {fechasDisponibles.map((fecha) => (
                                        <option key={fecha} value={fecha}>
                                            {mostrarFecha(fecha)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div className="filtro-formato">
                            <label htmlFor="formato">Formato</label>

                            <select
                                id="formato"
                                value={formatoActual}
                                disabled={formatosDisponibles.length <= 1}
                                onChange={(e) =>
                                    setFormatoSeleccionado(e.target.value)
                                }
                            >
                                {formatosDisponibles.map((formato) => (
                                    <option key={formato} value={formato}>
                                        {formato}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {grupos.length > 0 && (
                            <button
                                type="button"
                                className={`boton-cercania-detalle ${estado === "listo" ? "activo" : ""}`}
                                onClick={solicitar}
                                disabled={
                                    estado === "cargando" || estado === "listo"
                                }
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
                </div>

                {grupos.length === 0 ? (
                    <div className="sin-funciones">
                        <span aria-hidden="true">🎬</span>
                        <p>No hay funciones vigentes para esta fecha.</p>
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
                            {grupos.map(
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
                                            </div>

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
