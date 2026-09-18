import BuscadorPeliculas from './BuscadorPeliculas.tsx'

interface BarraNavegacionProps {
  busqueda: string
  onBusquedaChange: (nuevaBusqueda: string) => void
}

function BarraNavegacion({
  busqueda,
  onBusquedaChange,
}: BarraNavegacionProps) {
  return (
    <header className="barra-navegacion">
      <div className="contenido-navegacion">
        <div className="marca" aria-label="Reactivos con el cine">
          <span className="icono-marca" aria-hidden="true">
            ▶
          </span>
          <span>
            Reactivos <strong>con el cine</strong>
          </span>
        </div>

        <BuscadorPeliculas
          busqueda={busqueda}
          onBusquedaChange={onBusquedaChange}
        />

        <button
          type="button"
          className="boton-perfil"
          title="Perfil de usuario (próximamente)"
        >
          <span aria-hidden="true">👤</span>
          <span className="texto-perfil">Perfil</span>
        </button>
      </div>
    </header>
  )
}

export default BarraNavegacion
