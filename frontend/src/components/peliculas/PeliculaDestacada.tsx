import { Fragment, useId, useLayoutEffect, useRef } from "react";
import { Link } from "react-router-dom";
import type { Pelicula } from "../../types/types.ts";
import { useAuth } from "../../context/AuthContext.tsx";
import { useFavorites } from "../../context/FavoritesContext.tsx";
import { useMediaQuery } from "../../hooks/useMediaQuery.ts";
import {
    ajustarTextoPorPalabras,
    calcularLineasDisponibles,
} from "../../utils/textClamping.ts";
import { CalendarIcon, HeartIcon, StarIcon } from "../common/Icons.tsx";
import {
    type CategoriaDestacada,
    type ComplementoEtiquetaDestacada,
} from "../../utils/seleccionarDestacadas.ts";
import {
    formatearFechaEstrenoCompacta,
    resumirSinopsisDestacada,
    separarTituloDestacado,
} from "../../utils/formatearPeliculaDestacada.ts";

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
    const { user, openAuthModal } = useAuth();
    const { isFavoriteMovie, toggleFavoriteMovie } = useFavorites();
    const tituloId = useId();
    const esDesktop = useMediaQuery("(min-width: 769px)");
    const peliculaRef = useRef<HTMLElement>(null);
    const contenidoRef = useRef<HTMLDivElement>(null);
    const sinopsisRef = useRef<HTMLParagraphElement>(null);
    const esFavorita = isFavoriteMovie(pelicula.id);
    const tieneBanner = Boolean(
        pelicula.banner && pelicula.banner !== pelicula.poster,
    );
    const { tituloPrincipal, subtitulo } = separarTituloDestacado(
        pelicula.titulo,
    );
    const sinopsis = pelicula.sinopsis
        ? resumirSinopsisDestacada(pelicula.sinopsis)
        : "";
    const etiquetaMostrada = etiqueta || "Destacada de la semana";

    const metadatos = [
        pelicula.genero
            ? {
                  clave: "genero",
                  contenido: pelicula.genero,
                  className: "destacada-genero",
              }
            : null,
        pelicula.duracion !== null && pelicula.duracion > 0
            ? { clave: "duracion", contenido: `${pelicula.duracion} min` }
            : null,
        pelicula.clasificacion
            ? {
                  clave: "clasificacion",
                  contenido: pelicula.clasificacion,
                  className: "destacada-clasificacion",
              }
            : null,
    ].filter((item) => item !== null);

    const handleToggleFavorita = () => {
        if (!user) {
            openAuthModal();
            return;
        }
        void toggleFavoriteMovie(pelicula.id);
    };

    // Cambia cuando cambia el contenido que rodea la sinopsis.
    const claveRecorte = [
        pelicula.id,
        pelicula.titulo,
        subtitulo,
        metadatos.length,
        etiquetaMostrada,
        complemento?.tipo,
        complemento?.valor,
    ].join("|");

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
            const { lineas, alturaLinea } = calcularLineasDisponibles(
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
            ajustarTextoPorPalabras(sinopsisEl, sinopsis, lineas, alturaLinea);
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
    }, [esDesktop, claveRecorte, sinopsis]);

    return (
        <section
            ref={peliculaRef}
            className={`pelicula-destacada${tieneBanner ? "" : " destacada-sin-banner"}`}
            data-categoria-destacada={categoria}
            aria-labelledby={tituloId}
        >
            <div className="decoracion-destacada">
                <picture>
                    <source
                        media="(max-width: 768px)"
                        srcSet={pelicula.posterLimpio || pelicula.poster}
                    />
                    <img
                        src={pelicula.banner || pelicula.poster}
                        alt={`Imagen de ${pelicula.titulo}`}
                        decoding="async"
                        fetchPriority="high"
                    />
                </picture>
            </div>
            <div ref={contenidoRef} className="contenido-destacada">
                <div className="destacada-popularidad">
                    <p className="etiqueta-destacada">{etiquetaMostrada}</p>
                    {complemento && (
                        <span className="etiqueta-dato-destacada">
                            {complemento.tipo === "fecha" ? (
                                <>
                                    <CalendarIcon
                                        size={14}
                                        className="icono-dato-destacada"
                                    />
                                    <time dateTime={complemento.valor}>
                                        {formatearFechaEstrenoCompacta(
                                            complemento.valor,
                                        )}
                                    </time>
                                </>
                            ) : complemento.tipo === "favoritos" ? (
                                <>
                                    <HeartIcon
                                        size={14}
                                        filled
                                        className="icono-dato-destacada"
                                    />
                                    <span>
                                        {complemento.valor.toLocaleString(
                                            "es-CL",
                                        )}
                                    </span>
                                    <span className="visualmente-oculto">
                                        {complemento.valor === 1
                                            ? " favorito"
                                            : " favoritos"}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <StarIcon
                                        size={14}
                                        filled
                                        className="icono-dato-destacada"
                                    />
                                    <span>{complemento.valor}</span>
                                </>
                            )}
                        </span>
                    )}
                </div>
                <h1
                    id={tituloId}
                    title={tituloPrincipal}
                    className={
                        tituloPrincipal.length > 70
                            ? "destacada-titulo-largo destacada-titulo-extenso"
                            : tituloPrincipal.length > 45
                              ? "destacada-titulo-largo"
                              : ""
                    }
                >
                    {tituloPrincipal}
                </h1>
                {subtitulo && (
                    <p className="subtitulo-destacada">{subtitulo}</p>
                )}
                {metadatos.length > 0 && (
                    <p className="metadatos-destacada">
                        {metadatos.map((item, indice) => (
                            <Fragment key={item.clave}>
                                {indice > 0 && (
                                    <span
                                        className="destacada-separador"
                                        aria-hidden="true"
                                    >
                                        •
                                    </span>
                                )}
                                <span className={item.className}>
                                    {item.contenido}
                                </span>
                            </Fragment>
                        ))}
                    </p>
                )}
                {sinopsis && (
                    <p ref={sinopsisRef} className="sinopsis-destacada" />
                )}
                <div className="acciones-destacada">
                    <Link
                        to={`/peliculas/${pelicula.id}`}
                        className="boton-horarios"
                    >
                        Ver horarios
                    </Link>
                    <button
                        type="button"
                        className={`boton-fav-destacada ${esFavorita ? "activo" : ""}`}
                        aria-pressed={esFavorita}
                        aria-label={
                            esFavorita
                                ? `Quitar ${pelicula.titulo} de Mi lista`
                                : `Agregar ${pelicula.titulo} a Mi lista`
                        }
                        title={
                            esFavorita
                                ? "Quitar de Mi lista"
                                : "Agregar a Mi lista"
                        }
                        onClick={handleToggleFavorita}
                    >
                        <span className="corazon-destacada" aria-hidden="true">
                            {esFavorita ? "♥" : "♡"}
                        </span>
                        <span>Mi lista</span>
                    </button>
                </div>
            </div>
        </section>
    );
}

export default PeliculaDestacada;
