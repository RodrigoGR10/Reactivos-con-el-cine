import type { Pelicula } from '../types/types.ts'
import TarjetaPelicula from './TarjetaPelicula.tsx'

interface CarteleraProps {
  peliculas: Pelicula[]
}

function Cartelera({ peliculas }: CarteleraProps) {
  if (peliculas.length === 0) {
    return (
      <p className="sin-resultados" role="status">
        No encontramos películas que coincidan con tu búsqueda y filtros.
      </p>
    )
  }

  return (
    <div className="grilla-peliculas">
      {peliculas.map((pelicula) => (
        <TarjetaPelicula key={pelicula.id} pelicula={pelicula} />
      ))}
    </div>
  )
}

export default Cartelera
