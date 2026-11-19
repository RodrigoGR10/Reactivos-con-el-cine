import { Link } from "react-router-dom";
import type { Pelicula } from "../../types/types.ts";
import { useFavorites } from "../../context/FavoritesContext.tsx";
import { useAuth } from "../../context/AuthContext.tsx";
import { BotonFavorito } from "../common/BotonFavorito.tsx";
import { CalendarIcon } from "../common/Icons.tsx";
import {
  formatearFechaEstrenoCompacta,
  formatearFechaEstrenoCorta,
} from "../../utils/formatearPeliculaDestacada.ts";

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
        {pelicula.estadoEstreno === "preventa" && (
          <span className="etiqueta-preventa">
            {pelicula.fechaEstreno ? (
              <>
                <CalendarIcon size={14} className="icono-preventa" />
                <span className="texto-preventa">
                  <span className="visualmente-oculto">Estreno: </span>
                  <time dateTime={pelicula.fechaEstreno}>
                    <span className="fecha-preventa-larga">
                      {formatearFechaEstrenoCorta(pelicula.fechaEstreno)}
                    </span>
                    <span className="fecha-preventa-corta">
                      {formatearFechaEstrenoCompacta(pelicula.fechaEstreno)}
                    </span>
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
