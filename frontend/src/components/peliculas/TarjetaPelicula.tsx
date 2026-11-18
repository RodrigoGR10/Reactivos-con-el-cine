import { Link } from "react-router-dom";
import type { Pelicula } from "../../types/types.ts";
import { useFavoritesStore } from "../../stores/favoritesStore.ts";
import { useAuthStore } from "../../stores/authStore.ts";
import { BotonFavorito } from "../common/BotonFavorito.tsx";
import { CalendarIcon } from "../common/Icons.tsx";
import { formatearFechaEstrenoCorta } from "../../utils/formatearPeliculaDestacada.ts";

interface TarjetaPeliculaProps {
  pelicula: Pelicula;
}

function TarjetaPelicula({ pelicula }: TarjetaPeliculaProps) {
  const isAuthenticated = useAuthStore((state) => state.user !== null);
  const openAuthModal = useAuthStore((state) => state.openAuthModal);
  const esFavorita = useFavoritesStore((state) =>
    state.favoriteMovieIds.includes(pelicula.id),
  );
  const toggleFavoriteMovie = useFavoritesStore(
    (state) => state.toggleFavoriteMovie,
  );

  const handleToggleFavorito = () => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    void toggleFavoriteMovie(pelicula.id);
  };

  return (
    <article className="tarjeta-pelicula">
      <div className="poster-pelicula">
        <Link
          to={`/peliculas/${pelicula.id}`}
          className="enlace-poster-pelicula"
          tabIndex={-1}
          aria-hidden="true"
        >
          {pelicula.poster ? (
            <img src={pelicula.poster} alt={`Póster de ${pelicula.titulo}`} loading="lazy" decoding="async" />
          ) : (
            <div className="poster-placeholder" aria-hidden="true">
              <span className="icono-pelicula">🎬</span>
              <small>{pelicula.titulo}</small>
            </div>
          )}
        </Link>
        <span className="clasificacion">{pelicula.clasificacion}</span>
        {pelicula.estadoEstreno === "preventa" && (
          <span className="etiqueta-preventa">
            {pelicula.fechaEstreno ? (
              <>
                <CalendarIcon size={14} className="icono-preventa" />
                <span className="texto-preventa">
                  <span className="visualmente-oculto">Estreno: </span>
                  <time dateTime={pelicula.fechaEstreno}>
                    {formatearFechaEstrenoCorta(pelicula.fechaEstreno)}
                  </time>
                </span>
              </>
            ) : (
              <span className="texto-preventa">Preventa</span>
            )}
          </span>
        )}
        <div className="overlay-fav">
          <BotonFavorito
            activo={esFavorita}
            onClick={handleToggleFavorito}
            title={esFavorita ? "Quitar de favoritos" : "Añadir a favoritos"}
            ariaLabel={esFavorita ? "Quitar de favoritos" : "Añadir a favoritos"}
          />
        </div>
      </div>
      <div className="contenido-tarjeta">
        <h3>
          <Link
            to={`/peliculas/${pelicula.id}`}
            className="enlace-tarjeta-pelicula"
          >
            {pelicula.titulo}
          </Link>
        </h3>
        <p className="datos-pelicula">
          {pelicula.genero}
          {pelicula.duracion !== null && (
            <> <span aria-hidden="true">•</span> {pelicula.duracion} min</>
          )}
        </p>
      </div>
    </article>
  );
}

export default TarjetaPelicula;
