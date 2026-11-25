import { useEffect, useId, useRef, useState } from "react";
import { Accordion, Button, Skeleton } from "@mantine/core";
import type { Pelicula } from "../../types/types";
import { obtenerTrailer } from "../../utils/trailer";
import "./TrailerPelicula.css";

type PeliculaTrailer = Pick<
    Pelicula,
    "titulo" | "trailerUrl" | "banner" | "poster"
>;

/**
 * Incrusta el tráiler verificado asociado a la película, si existe.
 * @param pelicula Título y URL de tráiler listos para mostrar.
 * @returns Elemento de interfaz que representa el componente con las propiedades recibidas.
 */
export function TrailerPelicula({ pelicula }: { pelicula: PeliculaTrailer }) {
    const tituloId = useId();
    const reproductorRef = useRef<HTMLDivElement>(null);
    const [valorAcordeon, setValorAcordeon] = useState<string | null>(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(false);
    const trailer = obtenerTrailer(pelicula.trailerUrl);
    const abierto = valorAcordeon === "trailer";

    useEffect(() => {
        if (abierto && window.matchMedia("(max-width: 600px)").matches) {
            reproductorRef.current?.scrollIntoView({ block: "center" });
        }
    }, [abierto]);

    if (!trailer) return null;

    const cambiarAcordeon = (siguiente: string | null) => {
        if (siguiente === "trailer") {
            setCargando(true);
            setError(false);
        } else if (abierto && siguiente === null) {
            setError(false);
        }
        setValorAcordeon(siguiente);
    };

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
                            <span
                                className="trailer-acordeon-icono"
                                aria-hidden="true"
                            >
                                &#9654;
                            </span>
                            <span className="trailer-acordeon-titulo">
                                {abierto ? "Ocultar tráiler" : "Ver tráiler"}
                            </span>
                        </span>
                    </Accordion.Control>

                    <Accordion.Panel>
                        <div
                            className="trailer-reproductor"
                            ref={reproductorRef}
                        >
                            {error ? (
                                <div className="trailer-error" role="alert">
                                    <p>No se pudo reproducir el tráiler.</p>
                                    <Button
                                        color="cine"
                                        size="sm"
                                        onClick={() => {
                                            setError(false);
                                            setCargando(true);
                                        }}
                                    >
                                        Volver a intentar
                                    </Button>
                                </div>
                            ) : trailer.tipo === "youtube" ? (
                                <>
                                    {cargando && (
                                        <Skeleton
                                            className="trailer-skeleton"
                                            radius={0}
                                            aria-hidden="true"
                                        />
                                    )}
                                    <iframe
                                        src={trailer.embedUrl}
                                        title={`Tráiler de ${pelicula.titulo}`}
                                        className={
                                            cargando
                                                ? "trailer-iframe-cargando"
                                                : undefined
                                        }
                                        referrerPolicy="strict-origin-when-cross-origin"
                                        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share"
                                        allowFullScreen
                                        onLoad={() => setCargando(false)}
                                        onError={() => {
                                            setCargando(false);
                                            setError(true);
                                        }}
                                    />
                                </>
                            ) : (
                                <video
                                    controls
                                    playsInline
                                    preload="metadata"
                                    poster={pelicula.banner || pelicula.poster}
                                    aria-label={`Tráiler de ${pelicula.titulo}`}
                                    onError={() => setError(true)}
                                >
                                    <source
                                        src={trailer.url}
                                        type="video/mp4"
                                        onError={() => setError(true)}
                                    />
                                </video>
                            )}
                        </div>
                    </Accordion.Panel>
                </Accordion.Item>
            </Accordion>
        </section>
    );
}
