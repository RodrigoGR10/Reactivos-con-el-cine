import { Link } from "react-router-dom";
import { FilmIcon, SearchIcon } from "../../components/common/Icons";
import type { Pelicula } from "../../types/types";

interface ProfileSavedMoviesProps {
    hayUsuario: boolean;
    peliculasFavoritas: Pelicula[];
    peliculasFiltradas: Pelicula[];
    busqueda: string;
    editando: boolean;
    onQuitarFavorito: (id: string) => void;
}

export const ProfileSavedMovies = ({
    hayUsuario,
    peliculasFavoritas,
    peliculasFiltradas,
    busqueda,
    editando,
    onQuitarFavorito,
}: ProfileSavedMoviesProps) => (
    <div className="content-area">
        {peliculasFavoritas.length === 0 ? (
            <div className="empty-state-ultra">
                <div className="empty-icon-wrap">
                    <FilmIcon size={36} />
                </div>
                {hayUsuario ? (
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
        ) : peliculasFiltradas.length === 0 ? (
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
                {peliculasFiltradas.map((peli) => {
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
                                    state={{
                                        volverA: {
                                            to: "/perfil",
                                            label: "Volver a mi perfil",
                                        },
                                    }}
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
                                        onClick={() => onQuitarFavorito(peli.id)}
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
);
