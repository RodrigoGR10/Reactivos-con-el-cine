import {Link} from 'react-router-dom'
import type { Pelicula } from '../types/types.ts'

interface TarjetaPeliculaProps {
  pelicula: Pelicula
}

function TarjetaPelicula({ pelicula }: TarjetaPeliculaProps) {
  return (
    <article className="tarjeta-pelicula">
      {pelicula.poster ? (
        <img src={pelicula.poster} alt={`Póster de ${pelicula.titulo}`} />
      ) : (
        <div className="poster-placeholder" aria-hidden="true">
          <span className="icono-pelicula">🎬</span>
          <small>{pelicula.titulo}</small>
        </div>
      )}

      <div className="contenido-tarjeta">
        <h3>{pelicula.titulo}</h3>
        <p className="datos-pelicula">
          {pelicula.genero} <span aria-hidden="true">•</span>{' '}
          {pelicula.duracion} min
        </p>
        <div className="pie-tarjeta">
          <span className="clasificacion">{pelicula.clasificacion}</span>
          <Link to={`/peliculas/${pelicula.id}`} className="boton-tarjeta">
            Ver horarios
          </Link>
        </div>
      </div>
    </article>
  )
}

export default TarjetaPelicula
