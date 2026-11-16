import { Link } from "react-router-dom";
import type { Pelicula } from "../../types/types.ts";
import { useFavorites } from "../../context/FavoritesContext.tsx";
import { useAuth } from "../../context/AuthContext.tsx";
import { BotonFavorito } from "../common/BotonFavorito.tsx";

interface TarjetaPeliculaProps {
  pelicula: Pelicula;
}

function TarjetaPelicula({ pelicula }: TarjetaPeliculaProps) {
  const { user, openAuthModal } = useAuth();
  const { isFavoriteMovie, toggleFavoriteMovie } = useFavorites();
  const esFavorita = isFavoriteMovie(pelicula.id);

  const handleToggleFavorito = () => {
    if (!user) {
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
        {pelicula.estadoEstreno === "preventa" && (
          <p className="etiqueta-preventa">
            {pelicula.fechaEstreno
              ? <>Estreno: <time dateTime={pelicula.fechaEstreno}>{new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${pelicula.fechaEstreno}T00:00:00Z`))}</time></>
              : "Preventa"}
          </p>
        )}
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
