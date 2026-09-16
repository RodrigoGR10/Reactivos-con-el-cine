interface FiltrosPeliculasProps {
  generos: string[]
  clasificaciones: string[]
  generoSeleccionado: string
  clasificacionSeleccionada: string
  duracionSeleccionada: string
  hayFiltrosActivos: boolean
  onGeneroChange: (genero: string) => void
  onClasificacionChange: (clasificacion: string) => void
  onDuracionChange: (duracion: string) => void
  onLimpiar: () => void
}

function FiltrosPeliculas({
  generos,
  clasificaciones,
  generoSeleccionado,
  clasificacionSeleccionada,
  duracionSeleccionada,
  hayFiltrosActivos,
  onGeneroChange,
  onClasificacionChange,
  onDuracionChange,
  onLimpiar,
}: FiltrosPeliculasProps) {
  return (
    <section className="panel-filtros" aria-labelledby="titulo-filtros">
      <div className="encabezado-filtros">
        <div>
          <p className="subtitulo-seccion">Personaliza tu búsqueda</p>
          <h2 id="titulo-filtros">Filtrar cartelera</h2>
        </div>
        <button
          type="button"
          className="boton-limpiar"
          onClick={onLimpiar}
          disabled={!hayFiltrosActivos}
        >
          Limpiar filtros
        </button>
      </div>

      <div className="controles-filtros">
        <label>
          Género
          <select
            value={generoSeleccionado}
            onChange={(evento) => onGeneroChange(evento.target.value)}
          >
            <option value="">Todos los géneros</option>
            {generos.map((genero) => (
              <option key={genero} value={genero}>
                {genero}
              </option>
            ))}
          </select>
        </label>

        <label>
          Clasificación
          <select
            value={clasificacionSeleccionada}
            onChange={(evento) => onClasificacionChange(evento.target.value)}
          >
            <option value="">Todas las edades</option>
            {clasificaciones.map((clasificacion) => (
              <option key={clasificacion} value={clasificacion}>
                {clasificacion}
              </option>
            ))}
          </select>
        </label>

        <label>
          Duración
          <select
            value={duracionSeleccionada}
            onChange={(evento) => onDuracionChange(evento.target.value)}
          >
            <option value="">Cualquier duración</option>
            <option value="corta">Hasta 100 minutos</option>
            <option value="media">101 a 130 minutos</option>
            <option value="larga">Más de 130 minutos</option>
          </select>
        </label>
      </div>
    </section>
  )
}

export default FiltrosPeliculas
