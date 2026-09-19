import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { Pelicula, Cine, Funcion } from "../types/types";
import peliculaService from "../services/peliculas";
import cineService from "../services/cines";
import funcionService from "../services/funciones";
import { useFavorites } from "../context/FavoritesContext";
import { agruparFuncionesPorCine } from "../utils/agruparFunciones";
import "./MovieDetailPage.css";

function MovieDetailPage() {
    const { id } = useParams();
    const { toggleFavoriteMovie, isFavoriteMovie } = useFavorites();

    const peliculaId = Number(id ?? "1");

    const [pelicula, setPelicula] = useState<Pelicula | null>(null);
    const [funciones, setFunciones] = useState<Funcion[]>([]);
    const [cines, setCines] = useState<Cine[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [formatoSeleccionado, setFormatoSeleccionado] =
        useState("Todos");

    useEffect(() => {
        setError(null);

      Promise.all([
          peliculaService.getById(String(peliculaId)),
          funcionService.getByPelicula(peliculaId),
          cineService.getAll(),
        ])
            .then(([peliculaData, funcionesData, cinesData]) => {
                setPelicula(peliculaData);
                setFunciones(funcionesData);
                setCines(cinesData);
            })
            .catch(() => {
                setError("No se pudo cargar la información.");
            });
    }, [peliculaId]);

    if (error) {
        return (
            <div className="detalle-pelicula">
                <p className="mensaje-detalle">{error}</p>
            </div>
        );
    }

    if (!pelicula) {
        return (
            <div className="detalle-pelicula">
                <p className="mensaje-detalle">
                    Cargando película...
                </p>
            </div>
        );
    }

    const formatosDisponibles = funciones.reduce<string[]>(
        (acumulado, funcion) => {
            const yaExiste = acumulado.includes(funcion.formato);

            if (yaExiste) {
                return acumulado;
            }

            return [...acumulado, funcion.formato];
        },
        ["Todos"]
    );

    const funcionesFiltradas =
        formatoSeleccionado === "Todos"
            ? funciones
            : funciones.filter(
                (funcion) =>
                    funcion.formato === formatoSeleccionado
            );

    const grupos = agruparFuncionesPorCine(
        funcionesFiltradas,
        cines
    );

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
                            <div className="poster-detalle-placeholder">
                                🎬
                            </div>
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
                              className="boton-favorito"
                              onClick={() => toggleFavoriteMovie(pelicula.id)}
                            >
                              {isFavoriteMovie(pelicula.id) ? '♥' : '♡'}
                            </button>
                        </div>

                        <p className="sinopsis-detalle">
                            {pelicula.sinopsis}
                        </p>
                    </div>
                </section>

                <section
                    className="seccion-funciones"
                    aria-labelledby="titulo-funciones"
                >
                    <div className="encabezado-funciones">
                        <div>
                            <p className="subtitulo-seccion">
                                Elige dónde verla
                            </p>

                            <h2 id="titulo-funciones">
                                Funciones
                            </h2>
                        </div>

                        <div className="filtro-formato">
                            <label htmlFor="formato">
                                Formato
                            </label>

                            <select
                                id="formato"
                                value={formatoSeleccionado}
                                onChange={(e) =>
                                    setFormatoSeleccionado(
                                        e.target.value
                                    )
                                }
                            >
                                {formatosDisponibles.map(
                                    (formato) => (
                                        <option
                                            key={formato}
                                            value={formato}
                                        >
                                            {formato}
                                        </option>
                                    )
                                )}
                            </select>
                        </div>
                    </div>

                    {grupos.length === 0 ? (
                        <div className="sin-funciones">
                            <span aria-hidden="true">🎬</span>
                            <p>
                                No hay funciones disponibles
                                para este formato.
                            </p>
                        </div>
                    ) : (
                        <div className="lista-cines">
                            {grupos.map(({ cine, funciones }) => (
                                <article
                                    key={cine.id}
                                    className="tarjeta-cine"
                                >
                                    <div className="cabecera-cine">
                                        <div className="logo-cine">
                                            {cine.logo ? (
                                                <img
                                                    src={cine.logo}
                                                    alt={`Logo de ${cine.nombre}`}
                                                />
                                            ) : (
                                                <span>
                                                    🎬
                                                </span>
                                            )}
                                        </div>

                                        <div>
                                            <h3>
                                                {cine.nombre}
                                            </h3>
                                            <p>
                                                {cine.comuna}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="horarios-cine">
                                        {funciones.map(
                                            (funcion) => (
                                                <button
                                                    key={funcion.id}
                                                    type="button"
                                                    className="tarjeta-horario"
                                                >
                                                    <strong>
                                                        {
                                                            funcion.horario
                                                        }
                                                    </strong>

                                                    <span>
                                                        {
                                                            funcion.formato
                                                        }
                                                    </span>

                                                    <span>
                                                        {
                                                            funcion.idioma
                                                        }
                                                    </span>

                                                    <span className="precio-horario">
                                                        $
                                                        {
                                                            funcion.precio
                                                        }
                                                    </span>
                                                </button>
                                            )
                                        )}
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
        </div>
    );
}

export default MovieDetailPage;