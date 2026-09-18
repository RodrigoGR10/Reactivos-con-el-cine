import { useEffect, useState } from 'react'
import BarraNavegacion from '../components/BarraNavegacion.tsx'
import Cartelera from '../components/Cartelera.tsx'
import FiltrosPeliculas from '../components/FiltrosPeliculas.tsx'
import PeliculaDestacada from '../components/PeliculaDestacada.tsx'
import type { Pelicula } from '../types/types.ts'
import peliculaService from '../services/peliculas.ts'

function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('es-CL')
}

function cumpleFiltroDuracion(duracion: number, filtro: string,): boolean {
  if (filtro === 'corta') return duracion <= 100
  if (filtro === 'media') return duracion >= 101 && duracion <= 130
  if (filtro === 'larga') return duracion > 130
  return true
}

function PaginaPrincipal() {
  const [peliculas, setPeliculas] = useState<Pelicula[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [generoSeleccionado, setGeneroSeleccionado] = useState('')
  const [clasificacionSeleccionada, setClasificacionSeleccionada] = useState('')
  const [duracionSeleccionada, setDuracionSeleccionada] = useState('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    peliculaService
      .getAll()
      .then((peliculasData) => {
        setPeliculas(peliculasData)
      })
      .catch(() => {
        setError('No se pudieron cargar las películas.')
      })
      .finally(() => {
        setCargando(false)
      })
  }, [])

  const generosDisponibles = [
    ...new Set(peliculas.map(({ genero }) => genero)),
  ].sort()

  const clasificacionesDisponibles = [
    ...new Set(peliculas.map(({ clasificacion }) => clasificacion)),
  ].sort()

  const terminoBusqueda = normalizarTexto(busqueda.trim())

  const peliculasFiltradas = peliculas.filter((pelicula) => {
    const coincideTitulo = normalizarTexto(pelicula.titulo).includes(terminoBusqueda)
    const coincideGenero =
      generoSeleccionado === '' || pelicula.genero === generoSeleccionado
    const coincideClasificacion =
      clasificacionSeleccionada === '' || pelicula.clasificacion === clasificacionSeleccionada
    const coincideDuracion = cumpleFiltroDuracion(
      pelicula.duracion,
      duracionSeleccionada,
    )

    return (
      coincideTitulo &&
      coincideGenero &&
      coincideClasificacion &&
      coincideDuracion
    )
  })

  const hayFiltrosActivos =
    generoSeleccionado !== '' ||
    clasificacionSeleccionada !== '' ||
    duracionSeleccionada !== ''

  function limpiarFiltros() {
    setGeneroSeleccionado('')
    setClasificacionSeleccionada('')
    setDuracionSeleccionada('')
  }

  return (
    <>
      <BarraNavegacion
        busqueda={busqueda}
        onBusquedaChange={setBusqueda}
      />

      <main>
        {cargando ? (
          <p className="sin-resultados">
            Cargando películas...
          </p>
        ) : error ? (
          <p className="sin-resultados">
            {error}
          </p>
        ) : peliculas.length > 0 ? (
          <>
            <PeliculaDestacada pelicula={peliculas[0]} />

            <div className="contenido-principal">
              <FiltrosPeliculas
                generos={generosDisponibles}
                clasificaciones={clasificacionesDisponibles}
                generoSeleccionado={generoSeleccionado}
                clasificacionSeleccionada={clasificacionSeleccionada}
                duracionSeleccionada={duracionSeleccionada}
                hayFiltrosActivos={hayFiltrosActivos}
                onGeneroChange={setGeneroSeleccionado}
                onClasificacionChange={setClasificacionSeleccionada}
                onDuracionChange={setDuracionSeleccionada}
                onLimpiar={limpiarFiltros}
              />

              <section className="seccion-cartelera" aria-labelledby="titulo-cartelera">
                <div className="titulo-cartelera">
                  <div>
                    <p className="subtitulo-seccion">Ahora en cines</p>
                    <h2 id="titulo-cartelera">Cartelera</h2>
                  </div>
                  <p aria-live="polite">
                    {peliculasFiltradas.length}{' '}
                    {peliculasFiltradas.length === 1 ? 'película' : 'películas'}
                  </p>
                </div>
                <Cartelera peliculas={peliculasFiltradas} />
              </section>
            </div>
          </>
        ) : (
          <p className="sin-resultados">No hay películas disponibles.</p>
        )}
      </main>
    </>
  )
}

export default PaginaPrincipal
