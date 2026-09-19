import type { Pelicula } from '../types/types.ts'

interface PeliculaDestacadaProps {
  pelicula: Pelicula
}

function PeliculaDestacada({ pelicula }: PeliculaDestacadaProps) {
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
        <button type="button" className="boton-horarios" title="Próximamente">
          Ver horarios
        </button>
      </div>
    </section>
  )
}

export default PeliculaDestacada
