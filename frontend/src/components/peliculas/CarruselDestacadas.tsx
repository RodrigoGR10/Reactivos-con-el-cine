import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { Pelicula } from "../../types/types";
import { useAuth } from "../../context/AuthContext";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { ChevronLeftIcon, ChevronRightIcon } from "../common/Icons";
import PeliculaDestacada from "./PeliculaDestacada";
import "./CarruselDestacadas.css";

const INTERVALO_ROTACION_MS = 8_000;

interface TransicionDestacada {
  anterior: Pelicula;
  posicionAnterior: number;
  destino: string;
  direccion: 1 | -1;
}

export function CarruselDestacadas({ peliculas }: { peliculas: Pelicula[] }) {
  const [seleccionada, setSeleccionada] = useState<string | null>(null);
  const [transicion, setTransicion] = useState<TransicionDestacada | null>(null);
  const [tocando, setTocando] = useState(false);
  const [enPantalla, setEnPantalla] = useState(true);
  const [paginaVisible, setPaginaVisible] = useState(() => document.visibilityState === "visible");
  const carruselRef = useRef<HTMLElement>(null);
  const inicioToque = useRef<{ x: number; y: number } | null>(null);
  const reducirMovimiento = useMediaQuery("(prefers-reduced-motion: reduce)");
  const { isAuthModalOpen } = useAuth();
  const contenidoId = useId();
  const indice = Math.max(0, peliculas.findIndex((pelicula) => pelicula.id === seleccionada));
  const actual = peliculas[indice];
  const siguiente = peliculas[(indice + 1) % peliculas.length];
  const siguienteId = siguiente?.id;
  const enTransicion = !reducirMovimiento && transicion !== null && transicion.destino === actual?.id;
  const avanceActivo = !reducirMovimiento && peliculas.length > 1 && !tocando
    && enPantalla && paginaVisible && !isAuthModalOpen;

  const seleccionarPelicula = useCallback((id: string, direccion: 1 | -1) => {
    if (!actual || id === actual.id) return;
    setTransicion(reducirMovimiento ? null : {
      anterior: actual, posicionAnterior: indice + 1, destino: id, direccion,
    });
    setSeleccionada(id);
  }, [actual, indice, reducirMovimiento]);

  useEffect(() => {
    const actualizarVisibilidad = () => setPaginaVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", actualizarVisibilidad);
    const elemento = carruselRef.current;
    const observador = new IntersectionObserver(([entrada]) => {
      setEnPantalla(entrada.isIntersecting && entrada.intersectionRatio >= 0.15);
    }, { threshold: [0, 0.15] });
    if (elemento) observador.observe(elemento);
    return () => {
      document.removeEventListener("visibilitychange", actualizarVisibilidad);
      observador.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!transicion) return;
    // Respaldo si el navegador cancela la animacion al ocultar la pestana.
    const temporizador = window.setTimeout(() => {
      setTransicion(vigente => vigente === transicion ? null : vigente);
    }, 1_000);
    return () => window.clearTimeout(temporizador);
  }, [transicion]);

  const mover = (paso: 1 | -1) => {
    const destino = (indice + paso + peliculas.length) % peliculas.length;
    const pelicula = peliculas[destino];
    if (pelicula) seleccionarPelicula(pelicula.id, paso);
  };
  if (!actual) return null;

  return (
    <section
      ref={carruselRef}
      className="carrusel-destacadas"
      data-rotacion={avanceActivo ? "activa" : "pausada"}
      aria-label="Películas destacadas"
      aria-roledescription="carrusel"
      tabIndex={0}
      onKeyDown={(event) => {
        if (peliculas.length > 1 && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
          event.preventDefault();
          mover(event.key === "ArrowLeft" ? -1 : 1);
        }
      }}
      onTouchStart={(event) => {
        setTocando(true);
        const toque = event.touches[0];
        inicioToque.current = toque ? { x: toque.clientX, y: toque.clientY } : null;
      }}
      onTouchEnd={(event) => {
        const inicio = inicioToque.current;
        const fin = event.changedTouches[0];
        if (inicio && fin && peliculas.length > 1) {
          const dx = inicio.x - fin.clientX;
          const dy = inicio.y - fin.clientY;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) mover(dx > 0 ? 1 : -1);
        }
        inicioToque.current = null;
        setTocando(false);
      }}
      onTouchCancel={() => { inicioToque.current = null; setTocando(false); }}
    >
      {siguiente && siguiente.id !== actual.id && (
        <>
          <link rel="preload" as="image" href={siguiente.poster} media="(max-width: 768px)" fetchPriority="low" />
          <link rel="preload" as="image" href={siguiente.banner || siguiente.poster} media="(min-width: 769px)" fetchPriority="low" />
        </>
      )}
      <div className="destacadas-ventana">
        <div id={contenidoId} className="destacadas-contenido"
          data-direccion={transicion?.direccion === -1 ? "anterior" : "siguiente"}
          aria-live={avanceActivo || enTransicion ? "off" : "polite"}>
          {enTransicion && transicion && (
            <div key={`anterior-${transicion.anterior.id}`} className="destacadas-escena destacadas-escena-saliente" aria-hidden="true" inert>
              <PeliculaDestacada pelicula={transicion.anterior} posicion={transicion.posicionAnterior} />
            </div>
          )}
          <div key={actual.id} className={`destacadas-escena${enTransicion ? " destacadas-escena-entrante" : ""}`}
            onAnimationEnd={(event) => {
              if (event.target === event.currentTarget) {
                setTransicion(vigente => vigente?.destino === actual.id ? null : vigente);
              }
            }}>
            <PeliculaDestacada pelicula={actual} posicion={indice + 1} />
          </div>
        </div>
      </div>
      {peliculas.length > 1 && (
        <div className="destacadas-controles">
          <button
            type="button"
            className="destacadas-flecha"
            aria-label="Destacada anterior"
            title="Anterior"
            aria-controls={contenidoId}
            onClick={() => mover(-1)}
          >
            <ChevronLeftIcon size={18} />
          </button>
          <nav className="destacadas-selector" aria-label="Seleccionar película destacada">
            {peliculas.map((pelicula, posicion) => (
              <button key={pelicula.id} type="button" aria-label={`Ver destacada ${posicion + 1}: ${pelicula.titulo}`} aria-current={indice === posicion ? "true" : undefined} title={pelicula.titulo} onClick={() => seleccionarPelicula(pelicula.id, posicion < indice ? -1 : 1)}>
                <span className="destacadas-pista" aria-hidden="true">
                  <span
                    className={indice === posicion ? "destacadas-progreso" : undefined}
                    style={{ animationDuration: `${INTERVALO_ROTACION_MS}ms` }}
                    onAnimationEnd={() => {
                      if (indice === posicion && siguienteId) {
                        seleccionarPelicula(siguienteId, 1);
                      }
                    }}
                  />
                </span>
              </button>
            ))}
          </nav>
          <button
            type="button"
            className="destacadas-flecha"
            aria-label="Siguiente destacada"
            title="Siguiente"
            aria-controls={contenidoId}
            onClick={() => mover(1)}
          >
            <ChevronRightIcon size={18} />
          </button>
        </div>
      )}
    </section>
  );
}
