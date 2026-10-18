import { Link } from "react-router-dom";
import type { Pelicula } from "../../types/types.ts";
import { useAuth } from "../../context/AuthContext.tsx";
import { useFavorites } from "../../context/FavoritesContext.tsx";

interface PeliculaDestacadaProps {
  pelicula: Pelicula;
}

function PeliculaDestacada({ pelicula }: PeliculaDestacadaProps) {
  const { user, openAuthModal } = useAuth();
  const { isFavoriteMovie, toggleFavoriteMovie } = useFavorites();
  const esFavorita = isFavoriteMovie(pelicula.id);

  const handleToggleFavorita = () => {
    if (!user) {
      openAuthModal();
      return;
    }
    toggleFavoriteMovie(pelicula.id);
  };

  return (
    <section className="pelicula-destacada" aria-labelledby="titulo-destacada">
      <div className="decoracion-destacada">
        <img
          src={pelicula.banner || pelicula.poster}
          alt={`Banner de ${pelicula.titulo}`}
        />
      </div>

      <div className="contenido-destacada">
        <p className="etiqueta-destacada">Destacada de la semana</p>
        <h1 id="titulo-destacada">{pelicula.titulo}</h1>
        <p className="metadatos-destacada">
          {pelicula.genero}
          <span aria-hidden="true">•</span>
          {pelicula.duracion} min
          <span aria-hidden="true">•</span>
          {pelicula.clasificacion}
        </p>
        {pelicula.sinopsis && (
          <p className="sinopsis-destacada">{pelicula.sinopsis}</p>
        )}
        <div className="acciones-destacada">
          <Link to={`/peliculas/${pelicula.id}`} className="boton-horarios">
            Ver horarios
          </Link>
          <button
            type="button"
            className={`boton-fav-destacada ${esFavorita ? "activo" : ""}`}
            onClick={handleToggleFavorita}
            title={
              esFavorita
                ? "Quitar de Mi lista"
                : "Agregar a Mi lista"
            }
          >
            <span className="corazon-destacada" aria-hidden="true">
              {esFavorita ? "♥" : "♡"}
            </span>
            <span>Mi lista</span>
          </button>
        </div>
      </div>
    </section>
  );
}

export default PeliculaDestacada;
