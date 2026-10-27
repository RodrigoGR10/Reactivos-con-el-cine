import { useId, useState } from "react";
import { Link } from "react-router-dom";
import type { Pelicula } from "../../types/types.ts";
import { useAuth } from "../../context/AuthContext.tsx";
import { useFavorites } from "../../context/FavoritesContext.tsx";
import { totalFavoritos } from "../../utils/seleccionarDestacadas.ts";
import { resumirSinopsisDestacada, separarTituloDestacado } from "../../utils/formatearPeliculaDestacada.ts";

interface PeliculaDestacadaProps {
  pelicula: Pelicula;
  posicion: number;
}

function PeliculaDestacada({ pelicula, posicion }: PeliculaDestacadaProps) {
  const { user, openAuthModal } = useAuth();
  const { isFavoriteMovie, toggleFavoriteMovie } = useFavorites();
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tituloId = useId();
  const esFavorita = isFavoriteMovie(pelicula.id);
  const tieneBanner = Boolean(pelicula.banner && pelicula.banner !== pelicula.poster);
  const total = totalFavoritos(pelicula);
  const { tituloPrincipal, subtitulo } = separarTituloDestacado(pelicula.titulo);
  const sinopsis = pelicula.sinopsis ? resumirSinopsisDestacada(pelicula.sinopsis) : "";
  const etiqueta = total && total > 0 ? `N° ${posicion} en favoritos`
    : pelicula.estadoEstreno === "preventa" ? "Próximo estreno" : "En cartelera";

  const handleToggleFavorita = async () => {
    if (!user) {
      openAuthModal();
      return;
    }
    if (guardando) return;
    setGuardando(true);
    setError(null);
    const id = pelicula.id;
    try {
      if (!await toggleFavoriteMovie(id)) setError(id);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section className={`pelicula-destacada${tieneBanner ? "" : " destacada-sin-banner"}`} aria-labelledby={tituloId}>
      <div className="decoracion-destacada">
        <picture>
          <source media="(max-width: 768px)" srcSet={pelicula.poster} />
          <img src={pelicula.banner || pelicula.poster} alt={`Imagen de ${pelicula.titulo}`} decoding="async" fetchPriority="high" />
        </picture>
      </div>
      <div className="contenido-destacada">
        <div className="destacada-popularidad">
          <p className="etiqueta-destacada">{etiqueta}</p>
          {total !== undefined && (
            <span className="destacada-total-favoritos" aria-live="polite">
              <span aria-hidden="true">♥</span>
              {total.toLocaleString("es-CL")} {total === 1 ? "favorito" : "favoritos"}
            </span>
          )}
        </div>
        <h1 id={tituloId} title={tituloPrincipal} className={tituloPrincipal.length > 70 ? "destacada-titulo-largo destacada-titulo-extenso" : tituloPrincipal.length > 45 ? "destacada-titulo-largo" : ""}>{tituloPrincipal}</h1>
        {subtitulo && <p className="subtitulo-destacada">{subtitulo}</p>}
        <p className="metadatos-destacada">
          <span className="destacada-clasificacion">{pelicula.clasificacion}</span>
          <span>{pelicula.duracion} min</span>
          <span>{pelicula.genero}</span>
        </p>
        {sinopsis && <p className="sinopsis-destacada">{sinopsis}</p>}
        <div className="acciones-destacada">
          <Link to={`/peliculas/${pelicula.id}`} className="boton-horarios">Ver horarios</Link>
          <button
            type="button"
            className={`boton-fav-destacada ${esFavorita ? "activo" : ""}`}
            disabled={guardando}
            aria-pressed={esFavorita}
            aria-label={esFavorita ? `Quitar ${pelicula.titulo} de Mi lista` : `Agregar ${pelicula.titulo} a Mi lista`}
            title={esFavorita ? "Quitar de Mi lista" : "Agregar a Mi lista"}
            onClick={handleToggleFavorita}
          >
            <span className="corazon-destacada" aria-hidden="true">{esFavorita ? "♥" : "♡"}</span>
            <span>{guardando ? "Guardando..." : "Mi lista"}</span>
          </button>
        </div>
        {error === pelicula.id && <p className="destacada-error" role="alert">No se pudo guardar. Intenta de nuevo.</p>}
      </div>
    </section>
  );
}

export default PeliculaDestacada;
