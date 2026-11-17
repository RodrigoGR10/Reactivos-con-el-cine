import { useEffect, useId, useRef, useState } from "react";
import type { Pelicula } from "../../types/types";
import { obtenerTrailer } from "../../utils/trailer";
import { ChevronRightIcon, CloseIcon } from "../common/Icons";
import "./TrailerPelicula.css";

export function TrailerPelicula({ pelicula }: { pelicula: Pelicula }) {
  const tituloId = useId();
  const reproductorRef = useRef<HTMLDivElement>(null);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [error, setError] = useState(false);
  const [intentoMiniatura, setIntentoMiniatura] = useState(0);
  const trailer = obtenerTrailer(pelicula.trailerUrl);

  useEffect(() => {
    if (reproduciendo && window.matchMedia("(max-width: 600px)").matches) {
      reproductorRef.current?.scrollIntoView({ block: "center" });
    }
  }, [reproduciendo]);

  if (!trailer) return null;

  const miniaturaYoutube = trailer.tipo === "youtube" && intentoMiniatura < 2;
  const portada = miniaturaYoutube
    ? `https://i.ytimg.com/vi/${trailer.id}/${intentoMiniatura === 0 ? "maxresdefault" : "hqdefault"}.jpg`
    : pelicula.banner || pelicula.poster;
  const embedUrl = trailer.tipo === "youtube"
    ? `https://www.youtube-nocookie.com/embed/${trailer.id}?${new URLSearchParams({ autoplay: "1", playsinline: "1", rel: "0", origin: window.location.origin })}`
    : undefined;
  const reproducir = () => { setError(false); setReproduciendo(true); };

  return (
    <section className="trailer-detalle" aria-labelledby={tituloId}>
      <div className="trailer-encabezado">
        <div className="trailer-titulo">
          <h2 id={tituloId}>Tráiler</h2>
          {pelicula.trailerVersion && (
            <span className="trailer-version">
              {pelicula.trailerVersion === "subtitulado"
                ? "Subtitulado al español"
                : pelicula.trailerVersion === "doblado"
                  ? "Doblado al español"
                  : pelicula.trailerVersion === "original"
                    ? "Audio original en español"
                    : "Versión en español del cine"}
            </span>
          )}
        </div>
        <div className="trailer-acciones">
          <a href={trailer.url} target="_blank" rel="noopener noreferrer">
            {trailer.tipo === "youtube" ? "Ver en YouTube" : "Abrir video"}<ChevronRightIcon size={16} />
          </a>
          {reproduciendo && (
            <button type="button" className="trailer-cerrar" title="Cerrar tráiler" aria-label="Cerrar tráiler"
              onClick={() => { setReproduciendo(false); setError(false); }}><CloseIcon size={18} /></button>
          )}
        </div>
      </div>
      <div className="trailer-reproductor" ref={reproductorRef}>
        {!reproduciendo ? (
          <button type="button" className={`trailer-portada${miniaturaYoutube ? "" : " trailer-portada-poster"}`}
            aria-label={`Reproducir tráiler de ${pelicula.titulo}`} onClick={reproducir}>
            {portada && <img src={portada} alt="" loading="lazy" decoding="async" onError={() => setIntentoMiniatura(actual => Math.min(actual + 1, 2))} />}
            <span className="trailer-llamada"><span className="trailer-play" aria-hidden="true">&#9654;</span><span>Ver tráiler</span></span>
          </button>
        ) : error ? (
          <div className="trailer-error" role="alert">
            <p>No se pudo reproducir el tráiler.</p>
            <button type="button" onClick={reproducir}>Volver a intentar</button>
          </div>
        ) : trailer.tipo === "youtube" ? (
          <iframe src={embedUrl} title={`Tráiler de ${pelicula.titulo}`} referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen onError={() => setError(true)} />
        ) : (
          <video controls autoPlay playsInline preload="none" poster={pelicula.banner || pelicula.poster}
            aria-label={`Tráiler de ${pelicula.titulo}`} onError={() => setError(true)}>
            <source src={trailer.url} type="video/mp4" onError={() => setError(true)} />
          </video>
        )}
      </div>
    </section>
  );
}
