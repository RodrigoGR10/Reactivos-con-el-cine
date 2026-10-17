import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useFavorites } from "../context/FavoritesContext";
import { useDetallePelicula } from "../hooks/useDetallePelicula";
import { usePreciosFunciones } from "../hooks/usePreciosFunciones";
import { Mensaje } from "../components/common/Mensaje";
import { TarjetaFuncion } from "../components/funciones/TarjetaFuncion";
import { distanciaKM, formatearDistancia } from "../utils/distancia";
import { useUbicacion } from "../hooks/useUbicacion";
import "./MovieDetailPage.css";

import type { Cine } from "../types/types";

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
    const [cineSeleccionado, setCineSeleccionado] = useState("");
    const fechasDisponibles = [
        ...new Set(horarios.map((horario) => horario.fecha)),
    ].sort();
    const fechaActual = fechasDisponibles.includes(fechaSeleccionada)
        ? fechaSeleccionada
        : (fechasDisponibles[0] ?? "");
    const horariosDelDia = horarios.filter(
        (horario) => horario.fecha === fechaActual,
    );
    const grupos = cines
        .flatMap((cine) => {
            const sesiones = horariosDelDia.filter(
                (horario) => horario.cineId === cine.id,
            );
            return sesiones.length
                ? [{ cine, horarios: sesiones, distancia: distanciaA(cine) }]
                : [];
        })
        .sort((a, b) =>
            //Si las distancias son iguales, ordena por nombre, si no, por distancias (duh)
            a.distancia === b.distancia
                ? a.cine.nombre.localeCompare(b.cine.nombre)
                : a.distancia - b.distancia,
        );
    const cineActual = grupos.some(({ cine }) => cine.id === cineSeleccionado)
        ? cineSeleccionado
        : "";
    const precios = usePreciosFunciones(id, cineActual, fechaActual);
    const horariosActivos = precios.recibido
        ? precios.horarios
        : horariosDelDia.filter((horario) => horario.cineId === cineActual);
    const formatosDisponibles = [
        "Todos",
        ...new Set(
            horariosActivos.flatMap((horario) =>
                horario.tarifas.map((tarifa) => tarifa.formato),
            ),
        ),
    ];
    const formatoActual = formatosDisponibles.includes(formatoSeleccionado)
        ? formatoSeleccionado
        : "Todos";

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
                        <span aria-hidden="true">•</span>
                        <button
                            type="button"
                            className="boton-fav-peli"
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
                                disabled={
                                    !cineActual ||
                                    formatosDisponibles.length === 1
                                }
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
                    </div>
                </div>

                {grupos.length === 0 ? (
                    <div className="sin-funciones">
                        <span aria-hidden="true">🎬</span>
                        <p>No hay funciones vigentes para esta fecha.</p>
                    </div>
                ) : (
                    <>
                        <div className="orden-cercania">
                            {estado !== "listo" && (
                                <button
                                    type="button"
                                    className="boton-cercania"
                                    onClick={solicitar}
                                    disabled={estado === "cargando"}
                                >
                                    {estado === "cargando"
                                        ? "Obteniendo ubicación..."
                                        : "Ordenar por cercanía"}
                                </button>
                            )}

                            {estado === "listo" && (
                                <p className="aviso-cercania">
                                    Ordenado por cercania a tu ubicacion
                                </p>
                            )}

                            {estado === "denegado" && (
                                <p className="aviso-cercania">
                                    No pudimos acceder a tu ubicación. Habilita
                                    el permiso en tu navegador para ordenar por
                                    cercanía
                                </p>
                            )}
                            {estado === "error" && (
                                <p className="aviso-cercania">
                                    No se pudo obtener tu ubicación. Intenta
                                    denuevo.
                                </p>
                            )}
                        </div>
                        <div className="lista-cines">
                            {grupos.map(
                                ({ cine, horarios: sesiones, distancia }) => (
                                    <article
                                        key={cine.id}
                                        className="tarjeta-cine"
                                    >
                                        <div className="cabecera-cine">
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

                                            <button
                                                type="button"
                                                className="abrir-cine"
                                                aria-expanded={
                                                    cineActual === cine.id
                                                }
                                                aria-controls={`horarios-${cine.id}`}
                                                onClick={() => {
                                                    setCineSeleccionado(
                                                        cineActual === cine.id
                                                            ? ""
                                                            : cine.id,
                                                    );
                                                    setFormatoSeleccionado(
                                                        "Todos",
                                                    );
                                                }}
                                            >
                                                <span className="nombre-cine">
                                                    <strong>
                                                        <Link
                                                            to={`/cines/${cine.id}`}
                                                            className="enlace-cine-detalle"
                                                            onClick={(e) =>
                                                                e.stopPropagation()
                                                            }
                                                        >
                                                            {cine.nombre}
                                                        </Link>
                                                    </strong>
                                                    {Number.isFinite(
                                                        distancia,
                                                    ) && (
                                                        <i className="distancia-cine">
                                                            {formatearDistancia(
                                                                distancia,
                                                            )}
                                                        </i>
                                                    )}
                                                    <span>
                                                        {cine.comuna} ·{" "}
                                                        {sesiones.length}{" "}
                                                        {sesiones.length === 1
                                                            ? "horario"
                                                            : "horarios"}
                                                    </span>
                                                </span>
                                                <span
                                                    className="indicador-cine"
                                                    aria-hidden="true"
                                                >
                                                    {cineActual === cine.id
                                                        ? "-"
                                                        : "+"}
                                                </span>
                                            </button>
                                        </div>

                                        {cineActual === cine.id && (
                                            <div
                                                id={`horarios-${cine.id}`}
                                                className="contenido-horarios"
                                                aria-busy={precios.cargando}
                                            >
                                                <div
                                                    className="estado-precios"
                                                    role="status"
                                                    aria-live="polite"
                                                >
                                                    {precios.cargando && (
                                                        <p>
                                                            Consultando
                                                            precios...
                                                        </p>
                                                    )}
                                                    {precios.error && (
                                                        <p className="error-precios">
                                                            {precios.error}
                                                        </p>
                                                    )}
                                                    {!precios.cargando && (
                                                        <button
                                                            type="button"
                                                            className="reintentar-precios"
                                                            onClick={
                                                                precios.reintentar
                                                            }
                                                        >
                                                            Actualizar precios
                                                        </button>
                                                    )}
                                                </div>
                                                {horariosActivos.length ===
                                                    0 && (
                                                    <p className="mensaje-horarios">
                                                        Ya no hay horarios
                                                        vigentes para esta
                                                        fecha.
                                                    </p>
                                                )}
                                                {formatoActual !== "Todos" &&
                                                    !horariosActivos.some(
                                                        (horario) =>
                                                            horario.tarifas.some(
                                                                (tarifa) =>
                                                                    tarifa.formato ===
                                                                    formatoActual,
                                                            ),
                                                    ) && (
                                                        <p className="mensaje-horarios">
                                                            No hay funciones
                                                            disponibles para
                                                            este formato.
                                                        </p>
                                                    )}
                                                <div className="horarios-cine">
                                                    {horariosActivos.flatMap(
                                                        (horario) => {
                                                            if (
                                                                !horario.tarifas
                                                                    .length
                                                            ) {
                                                                return [
                                                                    <div
                                                                        className="tarjeta-horario tarjeta-horario-inactiva"
                                                                        key={
                                                                            horario.id
                                                                        }
                                                                    >
                                                                        <strong>
                                                                            {
                                                                                horario.horario
                                                                            }
                                                                        </strong>
                                                                        <span>
                                                                            {
                                                                                horario.idioma
                                                                            }
                                                                        </span>
                                                                        <span className="precio-pendiente">
                                                                            {horario.agotada
                                                                                ? "Agotada"
                                                                                : horario.estadoPrecio ===
                                                                                    "sin_tarifa"
                                                                                  ? "Sin tarifa normal publicada"
                                                                                  : horario.estadoPrecio ===
                                                                                      "error"
                                                                                    ? "Precio no disponible"
                                                                                    : "Precio pendiente"}
                                                                        </span>
                                                                    </div>,
                                                                ];
                                                            }
                                                            return horario.tarifas
                                                                .filter(
                                                                    (tarifa) =>
                                                                        formatoActual ===
                                                                            "Todos" ||
                                                                        tarifa.formato ===
                                                                            formatoActual,
                                                                )
                                                                .map(
                                                                    (
                                                                        funcion,
                                                                    ) => (
                                                                        <TarjetaFuncion
                                                                            key={
                                                                                funcion.id
                                                                            }
                                                                            funcion={
                                                                                funcion
                                                                            }
                                                                            pelicula={
                                                                                pelicula
                                                                            }
                                                                            cine={
                                                                                cine
                                                                            }
                                                                            precioAnterior={
                                                                                horario.estadoPrecio !==
                                                                                    "disponible" &&
                                                                                !horario.agotada
                                                                            }
                                                                            consultadoEn={
                                                                                horario.preciosConsultadosEn
                                                                            }
                                                                        />
                                                                    ),
                                                                );
                                                        },
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </article>
                                ),
                            )}
                        </div>
                    </>
                )}
            </section>
        </div>
    );
}

export default MovieDetailPage;
