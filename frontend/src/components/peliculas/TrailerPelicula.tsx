import { useEffect, useId, useRef, useState } from "react";
import { Accordion, Button } from "@mantine/core";
import type { Pelicula } from "../../types/types";
import { obtenerTrailer } from "../../utils/trailer";
import { ChevronRightIcon } from "../common/Icons";
import "./TrailerPelicula.css";

export function TrailerPelicula({ pelicula }: { pelicula: Pelicula }) {
  const tituloId = useId();
  const reproductorRef = useRef<HTMLDivElement>(null);
  const [valorAcordeon, setValorAcordeon] = useState<string | null>(null);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [error, setError] = useState(false);
  const [intentoMiniatura, setIntentoMiniatura] = useState(0);
  const trailer = obtenerTrailer(pelicula.trailerUrl);
  const abierto = valorAcordeon === "trailer";

  useEffect(() => {
    if (abierto && reproduciendo && window.matchMedia("(max-width: 600px)").matches) {
      reproductorRef.current?.scrollIntoView({ block: "center" });
    }
  }, [abierto, reproduciendo]);

  if (!trailer) return null;

  const miniaturaYoutube = trailer.tipo === "youtube" && intentoMiniatura < 2;
  const portada = miniaturaYoutube
    ? `https://i.ytimg.com/vi/${trailer.id}/${intentoMiniatura === 0 ? "maxresdefault" : "hqdefault"}.jpg`
    : pelicula.banner || pelicula.poster;
  const embedUrl = trailer.tipo === "youtube"
    ? `https://www.youtube-nocookie.com/embed/${trailer.id}?${new URLSearchParams({ autoplay: "1", playsinline: "1", rel: "0", origin: window.location.origin })}`
    : undefined;
  const cambiarAcordeon = (siguiente: string | null) => {
    if (abierto && siguiente === null) {
      setReproduciendo(false);
      setError(false);
    }
    setValorAcordeon(siguiente);
  };
  const reproducir = () => { setError(false); setReproduciendo(true); };

  return (
    <section className="trailer-detalle" aria-labelledby={tituloId}>
      <Accordion
        value={valorAcordeon}
        onChange={cambiarAcordeon}
        keepMounted={false}
        transitionDuration={200}
        className="trailer-acordeon-raiz"
      >
        <Accordion.Item value="trailer">
          <Accordion.Control id={tituloId}>
            <span className="trailer-acordeon-principal">
              <span className="trailer-acordeon-icono" aria-hidden="true">&#9654;</span>
              <span className="trailer-acordeon-titulo">
                {abierto ? "Ocultar tráiler" : "Ver tráiler"}
              </span>
            </span>
          </Accordion.Control>

          <Accordion.Panel>
            <div className="trailer-contenido">
              <div className="trailer-encabezado">
                <h2>Tráiler de {pelicula.titulo}</h2>
                <a href={trailer.url} target="_blank" rel="noopener noreferrer">
                  {trailer.tipo === "youtube" ? "Abrir en YouTube" : "Abrir video"}
                  <ChevronRightIcon size={16} />
                </a>
              </div>
              <div className="trailer-reproductor" ref={reproductorRef}>
                {!reproduciendo ? (
                  <button
                    type="button"
                    className={`trailer-portada${miniaturaYoutube ? "" : " trailer-portada-poster"}`}
                    aria-label={`Reproducir tráiler de ${pelicula.titulo}`}
                    onClick={reproducir}
                  >
                    {portada && (
                      <img
                        src={portada}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        onError={() => setIntentoMiniatura((actual) => Math.min(actual + 1, 2))}
                      />
                    )}
                    <span className="trailer-llamada">
                      <span className="trailer-play" aria-hidden="true">&#9654;</span>
                    </span>
                  </button>
                ) : error ? (
                  <div className="trailer-error" role="alert">
                    <p>No se pudo reproducir el tráiler.</p>
                    <Button color="cine" size="sm" onClick={reproducir}>
                      Volver a intentar
                    </Button>
                  </div>
                ) : trailer.tipo === "youtube" ? (
                  <iframe
                    src={embedUrl}
                    title={`Tráiler de ${pelicula.titulo}`}
                    referrerPolicy="strict-origin-when-cross-origin"
                    allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    onError={() => setError(true)}
                  />
                ) : (
                  <video
                    controls
                    autoPlay
                    playsInline
                    preload="none"
                    poster={pelicula.banner || pelicula.poster}
                    aria-label={`Tráiler de ${pelicula.titulo}`}
                    onError={() => setError(true)}
                  >
                    <source src={trailer.url} type="video/mp4" onError={() => setError(true)} />
                  </video>
                )}
              </div>
            </div>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </section>
  );
}
