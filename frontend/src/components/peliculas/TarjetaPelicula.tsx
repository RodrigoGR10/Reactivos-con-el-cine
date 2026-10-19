import { Link } from "react-router-dom";
import type { Pelicula } from "../../types/types.ts";
import { useFavorites } from "../../context/FavoritesContext.tsx";
import { useAuth } from "../../context/AuthContext.tsx";
interface TarjetaPeliculaProps {
  pelicula: Pelicula;
}

function TarjetaPelicula({ pelicula }: TarjetaPeliculaProps) {
  const { user, openAuthModal } = useAuth();
  const { isFavoriteMovie, toggleFavoriteMovie } = useFavorites();

  const handleToggleFavorito = () => {
    if (!user) {
      openAuthModal();
      return;
    }
    toggleFavoriteMovie(pelicula.id);
  };
  return (
    <article className="tarjeta-pelicula">
      <div className="poster-pelicula">
        {pelicula.poster ? (
          <img src={pelicula.poster} alt={`Póster de ${pelicula.titulo}`} />
        ) : (
          <div className="poster-placeholder" aria-hidden="true">
            <span className="icono-pelicula">🎬</span>
            <small>{pelicula.titulo}</small>
          </div>
        )}
        <div className="overlay-fav">
          <button
            type="button"
            className="boton-fav"
            onClick={handleToggleFavorito}
            aria-label={
              isFavoriteMovie(pelicula.id)
                ? "Quitar de favoritos"
                : "Añadir a favoritos"
            }
          >
            {isFavoriteMovie(pelicula.id) ? "♥" : "♡"}
          </button>
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
        <h3>{pelicula.titulo}</h3>
        <p className="datos-pelicula">
          {pelicula.genero} <span aria-hidden="true">•</span>{" "}
          {pelicula.duracion} min
        </p>
        <div className="pie-tarjeta">
          <span className="clasificacion">{pelicula.clasificacion}</span>
          <Link to={`/peliculas/${pelicula.id}`} className="boton-tarjeta" aria-label={`Ver horarios de ${pelicula.titulo}`}>
            Ver horarios
          </Link>
        </div>
      </div>
    </article>
  );
}

export default TarjetaPelicula;
