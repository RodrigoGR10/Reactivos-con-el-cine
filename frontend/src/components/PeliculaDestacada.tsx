import type { Pelicula } from '../types/types.ts'

interface PeliculaDestacadaProps {
  pelicula: Pelicula
}

function PeliculaDestacada({ pelicula }: PeliculaDestacadaProps) {
  return (
    <section className="pelicula-destacada" aria-labelledby="titulo-destacada">
      <div className="decoracion-destacada" aria-hidden="true">
        <div className="circulo-cine"></div>
        <span>🎬</span>
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
