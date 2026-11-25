import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Pelicula } from "../../types/types";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import {
    paginacionCarrusel,
    tarjetasPreventaVisibles,
} from "../../utils/paginacionCarrusel";
import { ChevronLeftIcon, ChevronRightIcon } from "../common/Icons";
import TarjetaPelicula from "./TarjetaPelicula";
import "./Preventas.css";

/** Muestra las películas con estado de estreno en preventa. */
function Preventas({ peliculas }: { peliculas: Pelicula[] }) {
    const esMovil = useMediaQuery("(max-width: 560px)");
    const [pagina, setPagina] = useState(0);
    const [visibles, setVisibles] = useState(() =>
        tarjetasPreventaVisibles(window.innerWidth, false),
    );
    const seccionRef = useRef<HTMLElement>(null);
    const inicioToque = useRef<{ x: number; y: number } | null>(null);
    const {
        pagina: paginaActual,
        ultimaPagina,
        posicion: actual,
        desde,
        hasta,
    } = paginacionCarrusel(peliculas.length, visibles, pagina);

    useEffect(() => {
        if (esMovil) return;
        const seccion = seccionRef.current;
        if (!seccion) return;
        const observador = new ResizeObserver(([entrada]) => {
            setVisibles(
                tarjetasPreventaVisibles(entrada.contentRect.width, false),
            );
        });
        observador.observe(seccion);
        return () => observador.disconnect();
    }, [esMovil]);

    const mover = (paso: number) =>
        setPagina(Math.max(0, Math.min(ultimaPagina, paginaActual + paso)));

    return (
        <section
            ref={seccionRef}
            className="seccion-preventas"
            aria-labelledby="titulo-preventas"
            aria-roledescription={esMovil ? undefined : "carrusel"}
            onKeyDown={(event) => {
                if (
                    !esMovil &&
                    (event.key === "ArrowLeft" || event.key === "ArrowRight")
                ) {
                    event.preventDefault();
                    mover(event.key === "ArrowLeft" ? -1 : 1);
                }
            }}
        >
            <div className="titulo-cartelera">
                <div>
                    <p className="subtitulo-seccion">Próximos estrenos</p>
                    <h2 id="titulo-preventas">Preventa</h2>
                </div>
                {peliculas.length > 0 &&
                    (esMovil ? (
                        <p aria-live="polite">
                            {peliculas.length}{" "}
                            {peliculas.length === 1 ? "película" : "películas"}
                        </p>
                    ) : (
                        <div className="navegacion-preventas">
                            <p className="estado-preventas" role="status">
                                {desde}–{hasta}{" "}
                                <span>de {peliculas.length}</span>
                            </p>
                            {ultimaPagina > 0 && (
                                <div
                                    className="controles-preventas"
                                    role="group"
                                    aria-label="Navegar preventas"
                                >
                                    <button
                                        type="button"
                                        aria-label="Ver preventas anteriores"
                                        title="Anteriores"
                                        aria-controls="fila-preventas"
                                        disabled={paginaActual === 0}
                                        onClick={() => mover(-1)}
                                    >
                                        <ChevronLeftIcon />
                                    </button>
                                    <button
                                        type="button"
                                        aria-label="Ver siguientes preventas"
                                        title="Siguientes"
                                        aria-controls="fila-preventas"
                                        disabled={paginaActual === ultimaPagina}
                                        onClick={() => mover(1)}
                                    >
                                        <ChevronRightIcon />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
            </div>
            {peliculas.length === 0 ? (
                <p className="sin-resultados" role="status">
                    No hay preventas que coincidan con tu búsqueda y filtros.
                </p>
            ) : esMovil ? (
                <div className="cinta-peliculas">
                    {peliculas.map((pelicula) => (
                        <TarjetaPelicula
                            key={pelicula.id}
                            pelicula={pelicula}
                        />
                    ))}
                </div>
            ) : (
                <div className="carrusel-preventas">
                    <div
                        className="ventana-preventas"
                        onTouchStart={(event) => {
                            const toque = event.touches[0];
                            inicioToque.current = toque
                                ? { x: toque.clientX, y: toque.clientY }
                                : null;
                        }}
                        onTouchEnd={(event) => {
                            const inicio = inicioToque.current;
                            const fin = event.changedTouches[0];
                            if (inicio && fin) {
                                const dx = inicio.x - fin.clientX;
                                const dy = inicio.y - fin.clientY;
                                if (
                                    Math.abs(dx) > 50 &&
                                    Math.abs(dx) > Math.abs(dy)
                                )
                                    mover(dx > 0 ? 1 : -1);
                            }
                            inicioToque.current = null;
                        }}
                        onTouchCancel={() => {
                            inicioToque.current = null;
                        }}
                    >
                        <div
                            id="fila-preventas"
                            className="fila-preventas"
                            style={
                                {
                                    "--posicion": actual,
                                    "--visibles": visibles,
                                } as CSSProperties
                            }
                        >
                            {peliculas.map((pelicula, indice) => (
                                <div
                                    className="elemento-preventa"
                                    key={pelicula.id}
                                    inert={
                                        indice < actual ||
                                        indice >= actual + visibles
                                    }
                                >
                                    <TarjetaPelicula pelicula={pelicula} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

export default Preventas;
