import { Fragment } from "react";
import type { Pelicula } from "../../types/types";
import { CalendarIcon, HeartIcon } from "../../components/common/Icons";
import { SinopsisExpandible } from "../../components/peliculas/SinopsisExpandible";
import { TrailerPelicula } from "../../components/peliculas/TrailerPelicula";
import {
    formatearFechaEstrenoCorta,
    formatearFechaEstrenoCompacta,
} from "../../utils/formatearPeliculaDestacada";

const ETIQUETAS_ESTRENO: Record<
    NonNullable<Pelicula["estadoEstreno"]>,
    string
> = {
    cartelera: "En cartelera",
    preventa: "Preventa",
    proximamente: "Próximamente",
};

interface MovieDetailHeroProps {
    pelicula: Pelicula;
    esFavorita: boolean;
    onToggleFavorite: () => void;
}

export function MovieDetailHero({
    pelicula,
    esFavorita,
    onToggleFavorite,
}: MovieDetailHeroProps) {
    const estadoEstreno = pelicula.estadoEstreno ?? "cartelera";
    const etiquetaEstado = ETIQUETAS_ESTRENO[estadoEstreno];

    const mostrarFechaEstreno =
        (estadoEstreno === "preventa" || estadoEstreno === "proximamente") &&
        Boolean(pelicula.fechaEstreno);
    const metadatos = [
        pelicula.genero
            ? { clave: "genero", contenido: pelicula.genero }
            : null,
        pelicula.duracion !== null && pelicula.duracion > 0
            ? { clave: "duracion", contenido: `${pelicula.duracion} min` }
            : null,
        pelicula.clasificacion
            ? {
                  clave: "clasificacion",
                  contenido: pelicula.clasificacion,
                  className: "metadato-clasificacion",
              }
            : null,
    ].filter((item) => item !== null);

    return (
        <>
            <section className="hero-detalle">
                <div className="poster-detalle">
                    {pelicula.poster ? (
                        <img
                            src={pelicula.poster}
                            alt={`Póster de ${pelicula.titulo}`}
                        />
                    ) : (
                        <div className="poster-detalle-placeholder">🎬</div>
                    )}
                </div>

                <div className="contenido-detalle">
                    <div className="detalle-estado-fila">
                        <p className="subtitulo-seccion">{etiquetaEstado}</p>
                        {mostrarFechaEstreno && pelicula.fechaEstreno && (
                            <span className="detalle-estado-fecha">
                                <CalendarIcon
                                    size={14}
                                    className="detalle-estado-icono"
                                />
                                <time dateTime={pelicula.fechaEstreno}>
                                    <span className="fecha-detalle-larga">
                                        {formatearFechaEstrenoCorta(
                                            pelicula.fechaEstreno,
                                        )}
                                    </span>
                                    <span className="fecha-detalle-corta">
                                        {formatearFechaEstrenoCompacta(
                                            pelicula.fechaEstreno,
                                        )}
                                    </span>
                                </time>
                            </span>
                        )}
                    </div>

                    <h1>{pelicula.titulo}</h1>

                    {metadatos.length > 0 && (
                        <div className="metadatos-detalle">
                            {metadatos.map((item, indice) => (
                                <Fragment key={item.clave}>
                                    {indice > 0 && (
                                        <span
                                            className="metadato-separador"
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
                        </div>
                    )}

                    <SinopsisExpandible
                        key={pelicula.id}
                        texto={pelicula.sinopsis}
                    />

                    <div className="acciones-detalle">
                        <button
                            type="button"
                            className={`boton-fav-detalle${esFavorita ? " activo" : ""}`}
                            aria-pressed={esFavorita}
                            aria-label={
                                esFavorita
                                    ? `Quitar ${pelicula.titulo} de Mi lista`
                                    : `Guardar ${pelicula.titulo} en Mi lista`
                            }
                            title={
                                esFavorita
                                    ? "Quitar de Mi lista"
                                    : "Guardar en Mi lista"
                            }
                            onClick={onToggleFavorite}
                        >
                            <HeartIcon
                                size={16}
                                filled={esFavorita}
                                className="icono-fav-detalle"
                            />
                            <span>
                                {esFavorita ? "En Mi lista" : "Mi lista"}
                            </span>
                        </button>
                    </div>
                </div>
            </section>
            <TrailerPelicula pelicula={pelicula} />
        </>
    );
}
