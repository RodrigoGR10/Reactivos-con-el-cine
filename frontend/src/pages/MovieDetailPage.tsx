import { useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useFavorites } from "../context/FavoritesContext";
import { agruparFuncionesPorCine } from "../utils/agruparFunciones";
import { useDetallePelicula } from "../hooks/useDetallePelicula";
import { Mensaje } from "../components/common/Mensaje";
import "./MovieDetailPage.css";

const mostrarFecha = (fecha: string) => new Intl.DateTimeFormat("es-CL", {
  weekday: "short", day: "numeric", month: "short", timeZone: "UTC",
}).format(new Date(`${fecha}T12:00:00Z`));

const precioCLP = (precio: number) => new Intl.NumberFormat("es-CL", {
  style: "currency", currency: "CLP", maximumFractionDigits: 0,
}).format(precio);

function MovieDetailPage() {
  const { id } = useParams();
  const {
    toggleFavoriteCinema,
    toggleFavoriteMovie,
    isFavoriteMovie,
    isFavoriteCinema,
  } = useFavorites();
  const { user, openAuthModal } = useAuth();

  const { pelicula, funciones, cines, error } = useDetallePelicula(id);

  const [formatoSeleccionado, setFormatoSeleccionado] = useState("Todos");
  const [fechaSeleccionada, setFechaSeleccionada] = useState("");

  if (error) return <Mensaje texto={error} />;

  if (!pelicula) return <Mensaje texto="Cargando película..." />;

  const fechasDisponibles = [...new Set(funciones.flatMap((funcion) => funcion.fecha ? [funcion.fecha] : []))].sort();
  const fechaActual = fechasDisponibles.includes(fechaSeleccionada) ? fechaSeleccionada : (fechasDisponibles[0] ?? "");
  const funcionesDelDia = funciones.filter((funcion) => !fechaActual || !funcion.fecha || funcion.fecha === fechaActual);
  const formatosDisponibles = [
    "Todos",
    ...new Set(funcionesDelDia.map((f) => f.formato)),
  ];
  const formatoActual = formatosDisponibles.includes(formatoSeleccionado) ? formatoSeleccionado : "Todos";

  const funcionesFiltradas =
    formatoActual === "Todos"
      ? funcionesDelDia
      : funcionesDelDia.filter((funcion) => funcion.formato === formatoActual);

  const grupos = agruparFuncionesPorCine(funcionesFiltradas, cines);

  return (
    <div className="detalle-pelicula">
      <section className="hero-detalle">
        <div className="poster-detalle">
          {pelicula.poster ? (
            <img src={pelicula.poster} alt={`Póster de ${pelicula.titulo}`} />
          ) : (
            <div className="poster-detalle-placeholder">🎬</div>
          )}
        </div>

        <div className="contenido-detalle">
          <p className="subtitulo-seccion">Información de la película</p>

          <h1>{pelicula.titulo}</h1>

          <div className="metadatos-detalle">
            <span>{pelicula.clasificacion}</span>
            <span aria-hidden="true">•</span>
            <span>{pelicula.genero}</span>
            <span aria-hidden="true">•</span>
            <span>{pelicula.duracion} min</span>
            <span aria-hidden="true">•</span>
            <button
              type="button"
              className="boton-fav-peli"
              onClick={() => {
                if (!user) {
                  openAuthModal();
                  return;
                }
                toggleFavoriteMovie(pelicula.id);
              }}
            >
              {isFavoriteMovie(pelicula.id) ? "♥" : "♡"}
            </button>
          </div>

          <p className="sinopsis-detalle">{pelicula.sinopsis}</p>
        </div>
      </section>

      <section className="seccion-funciones" aria-labelledby="titulo-funciones">
        <div className="encabezado-funciones">
          <div>
            <p className="subtitulo-seccion">Elige dónde verla</p>

            <h2 id="titulo-funciones">Funciones</h2>
          </div>

          <div className="filtros-funciones">
            {fechasDisponibles.length > 0 && (
              <div className="filtro-formato">
                <label htmlFor="fecha-funcion">Fecha</label>
                <select
                  id="fecha-funcion"
                  value={fechaActual}
                  onChange={(e) => {
                    setFechaSeleccionada(e.target.value);
                    setFormatoSeleccionado("Todos");
                  }}
                >
                  {fechasDisponibles.map((fecha) => (
                    <option key={fecha} value={fecha}>{mostrarFecha(fecha)}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="filtro-formato">
              <label htmlFor="formato">Formato</label>

              <select
                id="formato"
                value={formatoActual}
                onChange={(e) => setFormatoSeleccionado(e.target.value)}
              >
                {formatosDisponibles.map((formato) => (
                  <option key={formato} value={formato}>
                    {formato}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {grupos.length === 0 ? (
          <div className="sin-funciones">
            <span aria-hidden="true">🎬</span>
            <p>No hay funciones disponibles para este formato.</p>
          </div>
        ) : (
          <div className="lista-cines">
            {grupos.map(({ cine, funciones }) => (
              <article key={cine.id} className="tarjeta-cine">
                <div className="cabecera-cine">
                  <div className="logo-cine">
                    <button
                      type="button"
                      className="boton-fav-cine"
                      onClick={() => {
                        if (!user) {
                          openAuthModal();
                          return;
                        }
                        toggleFavoriteCinema(cine.id);
                      }}
                    >
                      {isFavoriteCinema(cine.id) ? "♥" : "♡"}
                    </button>
                    {cine.logo ? (
                      <img src={cine.logo} alt={`Logo de ${cine.nombre}`} />
                    ) : (
                      <span>🎬</span>
                    )}
                  </div>

                  <div>
                    <h3>{cine.nombre}</h3>
                    <p>{cine.comuna}</p>
                  </div>
                </div>

                <div className="horarios-cine">
                  {funciones.map((funcion) => (
                    <div
                      key={funcion.id}
                      className="tarjeta-horario"
                    >
                      <strong>{funcion.horario}</strong>

                      <span title={funcion.tipoEntrada}>{funcion.formato}</span>

                      <span>{funcion.idioma}</span>
                      {funcion.sala && <span>Sala {funcion.sala}</span>}
                      <span className="precio-horario">{precioCLP(funcion.precioOnline ?? funcion.precio)}</span>
                      {funcion.cargoServicio !== undefined && funcion.cargoServicio > 0 && (
                        <span className="desglose-precio">
                          Entrada {precioCLP(funcion.precio)} + servicio {precioCLP(funcion.cargoServicio)}
                        </span>
                      )}
                      {funcion.agotada && <span>Agotada</span>}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default MovieDetailPage;
