import Cartelera from "../components/peliculas/Cartelera.tsx";
import FiltrosPeliculas from "../components/peliculas/FiltrosPeliculas.tsx";
import PeliculaDestacada from "../components/peliculas/PeliculaDestacada.tsx";
import { usePeliculas } from "../hooks/usePelicula.ts";
import { useFiltrosPeliculas } from "../hooks/useFiltrosPeliculas.ts";

function PaginaPrincipal() {
  const { peliculas, cargando, error } = usePeliculas();

  const {
    filtros,
    cambiarFiltro,
    limpiarFiltros,
    hayFiltrosActivos,
    peliculasFiltradas,
    generosDisponibles,
    clasificacionesDisponibles,
  } = useFiltrosPeliculas(peliculas);

  if (cargando) return <p className="sin-resultados">Cargando películas...</p>;
  if (error) return <p className="sin-resultados">{error}</p>;
  if (peliculas.length === 0) {
    return <p className="sin-resultados">No hay películas disponibles.</p>;
  }

  return (
    <>
      <PeliculaDestacada pelicula={peliculas[0]} />

      <div className="contenido-principal">
        <FiltrosPeliculas
          busqueda={filtros.busqueda}
          onBusquedaChange={(valor) => cambiarFiltro("busqueda", valor)}
          generos={generosDisponibles}
          clasificaciones={clasificacionesDisponibles}
          generoSeleccionado={filtros.genero}
          clasificacionSeleccionada={filtros.clasificacion}
          duracionSeleccionada={filtros.duracion}
          hayFiltrosActivos={hayFiltrosActivos}
          onGeneroChange={(valor) => cambiarFiltro("genero", valor)}
          onClasificacionChange={(valor) =>
            cambiarFiltro("clasificacion", valor)
          }
          onDuracionChange={(valor) => cambiarFiltro("duracion", valor)}
          onLimpiar={limpiarFiltros}
        />

        <section
          className="seccion-cartelera"
          aria-labelledby="titulo-cartelera"
        >
          <div className="titulo-cartelera">
            <div>
              <p className="subtitulo-seccion">Ahora en cines</p>
              <h2 id="titulo-cartelera">Cartelera</h2>
            </div>
            <p aria-live="polite">
              {peliculasFiltradas.length}{" "}
              {peliculasFiltradas.length === 1 ? "película" : "películas"}
            </p>
          </div>
          <Cartelera peliculas={peliculasFiltradas} />
        </section>
      </div>
    </>
  );
}

export default PaginaPrincipal;
