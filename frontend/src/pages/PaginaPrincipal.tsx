import { Skeleton } from "@mantine/core";
import Cartelera from "../components/peliculas/Cartelera.tsx";
import FiltrosPeliculas from "../components/peliculas/FiltrosPeliculas.tsx";
import { CarruselDestacadas } from "../components/peliculas/CarruselDestacadas.tsx";
import Preventas from "../components/peliculas/Preventas.tsx";
import { usePeliculas } from "../hooks/usePelicula.ts";
import { useFiltrosPeliculas } from "../hooks/useFiltrosPeliculas.ts";
import { useFavoritosAlEntrar } from "../hooks/useFavoritosAlEntrar.ts";
import { totalFavoritos } from "../utils/seleccionarDestacadas.ts";
import type { Pelicula } from "../types/types.ts";
import { Mensaje } from "../components/common/Mensaje.tsx";
import RecomendadorPeliculas from "../components/recomendador/RecomendadorPeliculas.tsx";

const CARTELERA_ESQUELETO = [0, 1, 2, 3, 4, 5, 6, 7];

function PaginaPrincipal() {
  const { peliculas, peliculasDestacadas, cargando, error } = usePeliculas();
  const { peliculasFavoritasAlEntrar } = useFavoritosAlEntrar();

  const {
    filtros,
    cambiarFiltro,
    hayFiltrosActivos,
    peliculasFiltradas,
    generosDisponibles,
    clasificacionesDisponibles,
    duracionesDisponibles,
  } = useFiltrosPeliculas(peliculas);

  const compararPrioridad = (a: Pelicula, b: Pelicula) =>
    Number(peliculasFavoritasAlEntrar.has(b.id)) - Number(peliculasFavoritasAlEntrar.has(a.id))
    || (totalFavoritos(b) ?? 0) - (totalFavoritos(a) ?? 0);

  const cartelera = peliculasFiltradas.filter((pelicula) => pelicula.estadoEstreno !== "preventa")
    .sort(compararPrioridad);
  const preventas = peliculasFiltradas.filter((pelicula) => pelicula.estadoEstreno === "preventa")
    .sort((a, b) => (a.fechaEstreno ?? "9999").localeCompare(b.fechaEstreno ?? "9999")
      || a.titulo.localeCompare(b.titulo));

  if (!cargando && error) {
    return (
      <Mensaje
        tipo="error"
        titulo="Error al cargar la cartelera"
        texto={error}
      />
    );
  }
  if (!cargando && peliculas.length === 0) {
    return <p className="sin-resultados">No hay películas disponibles.</p>;
  }

  return (
    <>
      {cargando ? (
        <section className="carrusel-destacadas" aria-hidden="true">
          <div className="pelicula-destacada">
            <div className="contenido-destacada">
              <div className="destacada-popularidad">
                <Skeleton width={150} height={15} radius="sm" />
                <Skeleton width={90} height={15} radius="sm" />
              </div>
              <Skeleton width="52%" maw={520} height={54} radius="md" mb={14} />
              <Skeleton width={210} maw="85%" height={16} radius="sm" mb={18} />
              <Skeleton width="58%" maw={580} height={15} radius="sm" mb={8} />
              <Skeleton width="42%" maw={420} height={15} radius="sm" mb={26} />
              <div className="acciones-destacada">
                <Skeleton width={160} height={46} radius={8} maw="100%" />
                <Skeleton width={140} height={46} radius={8} maw="100%" />
              </div>
            </div>
          </div>
        </section>
      ) : (
        peliculasDestacadas.length > 0 && (
          <CarruselDestacadas peliculas={peliculasDestacadas} />
        )
      )}

      <div className="contenido-principal">
        <FiltrosPeliculas
          busqueda={filtros.busqueda}
          onBusquedaChange={(valor) => cambiarFiltro("busqueda", valor)}
          generos={generosDisponibles}
          clasificaciones={clasificacionesDisponibles}
          duraciones={duracionesDisponibles}
          generosSeleccionados={filtros.generos}
          clasificacionesSeleccionadas={filtros.clasificaciones}
          duracionSeleccionada={filtros.duracion}
          onGenerosChange={(valor) => cambiarFiltro("generos", valor)}
          onClasificacionesChange={(valor) =>
            cambiarFiltro("clasificaciones", valor)
          }
          onDuracionChange={(valor) => cambiarFiltro("duracion", valor)}
        />

        {cargando ? (
          <section
            className="seccion-cartelera"
            role="status"
            aria-busy="true"
          >
            <span className="visualmente-oculto">Cargando cartelera...</span>
            <div className="titulo-cartelera" aria-hidden="true">
              <div>
                <Skeleton width={110} height={13} radius="sm" mb={6} />
                <Skeleton width={150} height={28} radius="sm" />
              </div>
              <Skeleton width={88} height={20} radius="sm" />
            </div>
            <div className="grilla-peliculas" aria-hidden="true">
              {CARTELERA_ESQUELETO.map((idx) => (
                <div key={idx} className="tarjeta-pelicula">
                  <div className="poster-pelicula">
                    <Skeleton height="100%" radius={0} />
                  </div>
                  <div className="contenido-tarjeta">
                    <Skeleton width="76%" height={18} radius="sm" mb={8} />
                    <Skeleton width="48%" height={13} radius="sm" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <>
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
                <Cartelera
                  peliculas={cartelera}
                  hayFiltrosActivos={hayFiltrosActivos}
                  compararPrioridad={compararPrioridad}
                />
              </section>
            )}
            {preventas.length > 0 && (
              <Preventas
                key={preventas.map((pelicula) => pelicula.id).join(",")}
                peliculas={preventas}
              />
            )}
            {cartelera.length === 0 && preventas.length === 0 && (
              <p className="sin-resultados" role="status">
                No encontramos películas que coincidan con tu búsqueda y filtros.
              </p>
            )}
          </>
        )}

        <RecomendadorPeliculas />
      </div>
    </>
  );
}

export default PaginaPrincipal;
