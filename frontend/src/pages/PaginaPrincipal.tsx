import Cartelera from "../components/peliculas/Cartelera.tsx";
import FiltrosPeliculas from "../components/peliculas/FiltrosPeliculas.tsx";
import { CarruselDestacadas } from "../components/peliculas/CarruselDestacadas.tsx";
import Preventas from "../components/peliculas/Preventas.tsx";
import { usePeliculas } from "../hooks/usePelicula.ts";
import { useFiltrosPeliculas } from "../hooks/useFiltrosPeliculas.ts";
import { useFavorites } from "../context/FavoritesContext.tsx";
import { totalFavoritos } from "../utils/seleccionarDestacadas.ts";
import type { Pelicula } from "../types/types.ts";

function PaginaPrincipal() {
  const { peliculas, peliculasDestacadas, cargando, error } = usePeliculas();
  const { isFavoriteMovie } = useFavorites();

  const {
    filtros,
    cambiarFiltro,
    limpiarFiltros,
    hayFiltrosActivos,
    peliculasFiltradas,
    generosDisponibles,
    clasificacionesDisponibles,
  } = useFiltrosPeliculas(peliculas);

  const compararPrioridad = (a: Pelicula, b: Pelicula) =>
    Number(isFavoriteMovie(b.id)) - Number(isFavoriteMovie(a.id))
    || (totalFavoritos(b) ?? 0) - (totalFavoritos(a) ?? 0);

  const cartelera = peliculasFiltradas.filter((pelicula) => pelicula.estadoEstreno !== "preventa")
    .sort(compararPrioridad);
  const preventas = peliculasFiltradas.filter((pelicula) => pelicula.estadoEstreno === "preventa")
    .sort((a, b) => compararPrioridad(a, b)
      || (a.fechaEstreno ?? "9999").localeCompare(b.fechaEstreno ?? "9999")
      || a.titulo.localeCompare(b.titulo));

  if (cargando) return <p className="sin-resultados">Cargando películas...</p>;
  if (error) return <p className="sin-resultados">{error}</p>;
  if (peliculas.length === 0) {
    return <p className="sin-resultados">No hay películas disponibles.</p>;
  }

  return (
    <>
      {peliculasDestacadas.length > 0 && <CarruselDestacadas peliculas={peliculasDestacadas} />}

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

        {cartelera.length > 0 && (
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
                {cartelera.length}{" "}
                {cartelera.length === 1 ? "película" : "películas"}
              </p>
            </div>
            <Cartelera peliculas={cartelera} hayFiltrosActivos={hayFiltrosActivos} compararPrioridad={compararPrioridad} />
          </section>
        )}
        {preventas.length > 0 && <Preventas key={preventas.map((pelicula) => pelicula.id).join(",")} peliculas={preventas} />}
        {cartelera.length === 0 && preventas.length === 0 && (
          <p className="sin-resultados" role="status">
            No encontramos películas que coincidan con tu búsqueda y filtros.
          </p>
        )}
      </div>
    </>
  );
}

export default PaginaPrincipal;
