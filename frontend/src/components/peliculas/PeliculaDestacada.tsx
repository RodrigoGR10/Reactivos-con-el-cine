import { Fragment, useId, useLayoutEffect, useRef } from "react";
import { Link } from "react-router-dom";
import type { Pelicula } from "../../types/types.ts";
import { useAuthStore } from "../../stores/authStore.ts";
import { useFavoritesStore } from "../../stores/favoritesStore.ts";
import { useMediaQuery } from "../../hooks/useMediaQuery.ts";
import { CalendarIcon, StarIcon } from "../common/Icons.tsx";
import {
  totalFavoritos,
  type CategoriaDestacada,
  type ComplementoEtiquetaDestacada,
} from "../../utils/seleccionarDestacadas.ts";
import {
  formatearFechaEstrenoCorta,
  resumirSinopsisDestacada,
  separarTituloDestacado,
} from "../../utils/formatearPeliculaDestacada.ts";

const SINOPSIS_LINEAS_POR_DEFECTO = 5;
const FACTOR_INTERLINEADO_SINOPSIS = 1.65;

function altoExterior(elemento: Element): number {
  const estilo = window.getComputedStyle(elemento);
  if (estilo.display === "none") return 0;
  const margenTop = parseFloat(estilo.marginTop) || 0;
  const margenBottom = parseFloat(estilo.marginBottom) || 0;
  return elemento.getBoundingClientRect().height + margenTop + margenBottom;
}

function calcularLineasSinopsis(
  peliculaEl: HTMLElement,
  contenidoEl: HTMLElement,
  sinopsisEl: HTMLElement,
): { lineas: number; alturaLinea: number } {
  const estiloContenido = window.getComputedStyle(contenidoEl);
  const paddingVertical =
    (parseFloat(estiloContenido.paddingTop) || 0) +
    (parseFloat(estiloContenido.paddingBottom) || 0);

  let alturaOtrosElementos = 0;
  for (const hijo of contenidoEl.children) {
    if (hijo !== sinopsisEl) {
      alturaOtrosElementos += altoExterior(hijo);
    }
  }

  const estiloSinopsis = window.getComputedStyle(sinopsisEl);
  const fontSize = parseFloat(estiloSinopsis.fontSize) || 16;
  const rawLineHeight = parseFloat(estiloSinopsis.lineHeight);
  const alturaLinea =
    Number.isFinite(rawLineHeight) && rawLineHeight > 0
      ? rawLineHeight
      : fontSize * FACTOR_INTERLINEADO_SINOPSIS;
  const margenSinopsis =
    (parseFloat(estiloSinopsis.marginTop) || 0) +
    (parseFloat(estiloSinopsis.marginBottom) || 0);

  const maxLineasCss =
    parseInt(estiloContenido.getPropertyValue("--sinopsis-lineas-max"), 10) ||
    SINOPSIS_LINEAS_POR_DEFECTO;

  const espacioDisponible =
    peliculaEl.clientHeight - paddingVertical - alturaOtrosElementos - margenSinopsis;
  const lineasDisponibles = Math.floor((espacioDisponible + 1) / alturaLinea);
  return {
    lineas: Math.max(0, Math.min(maxLineasCss, lineasDisponibles)),
    alturaLinea,
  };
}

function formatearPrefijoPalabras(palabras: readonly string[], cantidad: number): string {
  const base = palabras
    .slice(0, cantidad)
    .join(" ")
    .replace(/[.,;:!?¿¡—–-]+$/, "");
  return `${base}...`;
}

function ajustarTextoSinopsisPorPalabras(
  sinopsisEl: HTMLElement,
  textoCompleto: string,
  lineas: number,
  alturaLinea: number,
): void {
  sinopsisEl.dataset.sinopsisMidiendo = "true";
  sinopsisEl.textContent = textoCompleto;

  const alturaMax = lineas * alturaLinea + Math.max(2, alturaLinea * 0.25);
  if (sinopsisEl.getBoundingClientRect().height <= alturaMax) {
    delete sinopsisEl.dataset.sinopsisMidiendo;
    return;
  }

  const palabras = textoCompleto.trim().split(/\s+/).filter(Boolean);
  let lo = 1;
  let hi = palabras.length - 1;
  let mejor = 0;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    sinopsisEl.textContent = formatearPrefijoPalabras(palabras, mid);
    if (sinopsisEl.getBoundingClientRect().height <= alturaMax) {
      mejor = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  sinopsisEl.textContent =
    mejor > 0 ? formatearPrefijoPalabras(palabras, mejor) : textoCompleto;
  delete sinopsisEl.dataset.sinopsisMidiendo;
}

interface PeliculaDestacadaProps {
  pelicula: Pelicula;
  etiqueta?: string;
  complemento?: ComplementoEtiquetaDestacada;
  categoria?: CategoriaDestacada;
}

function PeliculaDestacada({
  pelicula,
  etiqueta,
  complemento,
  categoria,
}: PeliculaDestacadaProps) {
  const isAuthenticated = useAuthStore((state) => state.user !== null);
  const openAuthModal = useAuthStore((state) => state.openAuthModal);
  const esFavorita = useFavoritesStore((state) =>
    state.favoriteMovieIds.includes(pelicula.id),
  );
  const toggleFavoriteMovie = useFavoritesStore(
    (state) => state.toggleFavoriteMovie,
  );
  const tituloId = useId();
  const esDesktop = useMediaQuery("(min-width: 769px)");
  const esAlturaCorta = useMediaQuery("(max-height: 700px)");
  const peliculaRef = useRef<HTMLElement>(null);
  const contenidoRef = useRef<HTMLDivElement>(null);
  const sinopsisRef = useRef<HTMLParagraphElement>(null);
  const tieneBanner = Boolean(pelicula.banner && pelicula.banner !== pelicula.poster);
  const total = totalFavoritos(pelicula);
  const { tituloPrincipal, subtitulo } = separarTituloDestacado(pelicula.titulo);
  const sinopsis = pelicula.sinopsis ? resumirSinopsisDestacada(pelicula.sinopsis) : "";
  const etiquetaMostrada = etiqueta || "Destacada de la semana";
  const contadorFavoritos =
    total !== undefined && total > 0 ? (
      <span className="destacada-total-favoritos" aria-live="polite">
        <span aria-hidden="true">♥</span>
        {total.toLocaleString("es-CL")} {total === 1 ? "favorito" : "favoritos"}
      </span>
    ) : null;

  const metadatos = [
    pelicula.genero ? { clave: "genero", contenido: pelicula.genero, className: "destacada-genero" } : null,
    pelicula.duracion !== null && pelicula.duracion > 0
      ? { clave: "duracion", contenido: `${pelicula.duracion} min` }
      : null,
    pelicula.clasificacion ? { clave: "clasificacion", contenido: pelicula.clasificacion, className: "destacada-clasificacion" } : null,
  ].filter((item) => item !== null);

  const handleToggleFavorita = () => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    void toggleFavoriteMovie(pelicula.id);
  };

  useLayoutEffect(() => {
    const peliculaEl = peliculaRef.current;
    const contenidoEl = contenidoRef.current;
    const sinopsisEl = sinopsisRef.current;
    if (!sinopsisEl) return;

    if (!esDesktop || !peliculaEl || !contenidoEl) {
      sinopsisEl.style.removeProperty("--sinopsis-lineas");
      delete sinopsisEl.dataset.sinopsisOculta;
      delete sinopsisEl.dataset.sinopsisMidiendo;
      sinopsisEl.textContent = sinopsis;
      return;
    }

    const actualizarRecorte = () => {
      const { lineas, alturaLinea } = calcularLineasSinopsis(
        peliculaEl,
        contenidoEl,
        sinopsisEl,
      );
      sinopsisEl.style.setProperty("--sinopsis-lineas", String(lineas));
      if (lineas === 0) {
        sinopsisEl.dataset.sinopsisOculta = "true";
        delete sinopsisEl.dataset.sinopsisMidiendo;
        sinopsisEl.textContent = sinopsis;
        return;
      }
      delete sinopsisEl.dataset.sinopsisOculta;
      ajustarTextoSinopsisPorPalabras(sinopsisEl, sinopsis, lineas, alturaLinea);
    };

    actualizarRecorte();

    const observador = new ResizeObserver(actualizarRecorte);
    observador.observe(peliculaEl);
    for (const hijo of contenidoEl.children) {
      if (hijo !== sinopsisEl) observador.observe(hijo);
    }

    let desmontado = false;
    void document.fonts?.ready.then(() => {
      if (!desmontado) actualizarRecorte();
    });

    return () => {
      desmontado = true;
      observador.disconnect();
    };
  }, [esDesktop, esAlturaCorta, pelicula.id, pelicula.titulo, sinopsis, subtitulo, metadatos.length, total, etiquetaMostrada, complemento?.tipo, complemento?.valor]);

  return (
    <section
      ref={peliculaRef}
      className={`pelicula-destacada${tieneBanner ? "" : " destacada-sin-banner"}`}
      data-categoria-destacada={categoria}
      aria-labelledby={tituloId}
    >
      <div className="decoracion-destacada">
        <picture>
          <source media="(max-width: 768px)" srcSet={pelicula.poster} />
          <img src={pelicula.banner || pelicula.poster} alt={`Imagen de ${pelicula.titulo}`} decoding="async" fetchPriority="high" />
        </picture>
      </div>
      <div ref={contenidoRef} className="contenido-destacada">
        <div className="destacada-popularidad">
          <p className="etiqueta-destacada">{etiquetaMostrada}</p>
          {complemento && (
            <span className="etiqueta-dato-destacada">
              {complemento.tipo === "fecha" ? (
                <>
                  <CalendarIcon size={14} className="icono-dato-destacada" />
                  <time dateTime={complemento.valor}>
                    {formatearFechaEstrenoCorta(complemento.valor)}
                  </time>
                </>
              ) : (
                <>
                  <StarIcon size={14} filled className="icono-dato-destacada" />
                  <span>{complemento.valor}</span>
                </>
              )}
            </span>
          )}
          {!esDesktop && contadorFavoritos}
        </div>
        <h1 id={tituloId} title={tituloPrincipal} className={tituloPrincipal.length > 70 ? "destacada-titulo-largo destacada-titulo-extenso" : tituloPrincipal.length > 45 ? "destacada-titulo-largo" : ""}>{tituloPrincipal}</h1>
        {subtitulo && <p className="subtitulo-destacada">{subtitulo}</p>}
        {metadatos.length > 0 && (
          <p className="metadatos-destacada">
            {metadatos.map((item, indice) => (
              <Fragment key={item.clave}>
                {indice > 0 && (
                  <span className="destacada-separador" aria-hidden="true">
                    •
                  </span>
                )}
                <span className={item.className}>{item.contenido}</span>
              </Fragment>
            ))}
          </p>
        )}
        {sinopsis && <p ref={sinopsisRef} className="sinopsis-destacada" />}
        <div className="acciones-destacada">
          <Link to={`/peliculas/${pelicula.id}`} className="boton-horarios">Ver horarios</Link>
          <button
            type="button"
            className={`boton-fav-destacada ${esFavorita ? "activo" : ""}`}
            aria-pressed={esFavorita}
            aria-label={esFavorita ? `Quitar ${pelicula.titulo} de Mi lista` : `Agregar ${pelicula.titulo} a Mi lista`}
            title={esFavorita ? "Quitar de Mi lista" : "Agregar a Mi lista"}
            onClick={handleToggleFavorita}
          >
            <span className="corazon-destacada" aria-hidden="true">{esFavorita ? "♥" : "♡"}</span>
            <span>Mi lista</span>
          </button>
          {esDesktop && contadorFavoritos}
        </div>
      </div>
    </section>
  );
}

export default PeliculaDestacada;
