import { useEffect, useState, type CSSProperties } from "react";
import type { Pelicula } from "../../types/types";
import TarjetaPelicula from "./TarjetaPelicula";
import "./Preventas.css";

const consultas = ["(min-width: 1440px)", "(min-width: 1100px)", "(min-width: 700px)"];
const tarjetasVisibles = () => {
  const indice = consultas.findIndex((consulta) => window.matchMedia(consulta).matches);
  return indice === -1 ? 1 : 4 - indice;
};

function Preventas({ peliculas }: { peliculas: Pelicula[] }) {
  const [posicion, setPosicion] = useState(0);
  const [visibles, setVisibles] = useState(tarjetasVisibles);
  const [inicioToque, setInicioToque] = useState<number | null>(null);
  const ultimaPosicion = Math.max(0, peliculas.length - visibles);
  const actual = Math.min(posicion, ultimaPosicion);

  useEffect(() => {
    const medios = consultas.map((consulta) => window.matchMedia(consulta));
    const actualizar = () => setVisibles(tarjetasVisibles());
    medios.forEach((medio) => medio.addEventListener("change", actualizar));
    return () => medios.forEach((medio) => medio.removeEventListener("change", actualizar));
  }, []);

  const mover = (paso: number) => setPosicion(Math.max(0, Math.min(ultimaPosicion, actual + paso)));

  return (
    <section className="seccion-preventas" aria-labelledby="titulo-preventas" aria-roledescription="carrusel">
      <div className="titulo-cartelera">
        <div>
          <p className="subtitulo-seccion">Asegura tu entrada</p>
          <h2 id="titulo-preventas">Películas en preventa</h2>
        </div>
        <div className="controles-preventas">
          <button type="button" aria-label="Ver preventas anteriores" aria-controls="fila-preventas" disabled={actual === 0} onClick={() => mover(-1)}>
            <span aria-hidden="true">‹</span>
          </button>
          <button type="button" aria-label="Ver siguientes preventas" aria-controls="fila-preventas" disabled={actual === ultimaPosicion} onClick={() => mover(1)}>
            <span aria-hidden="true">›</span>
          </button>
        </div>
      </div>
      {peliculas.length === 0 ? (
        <p className="sin-resultados" role="status">No hay preventas que coincidan con tu búsqueda y filtros.</p>
      ) : (
        <>
          <p className="estado-preventas" aria-live="polite">
            {actual + 1}–{Math.min(actual + visibles, peliculas.length)} de {peliculas.length} películas
          </p>
          <div className="ventana-preventas"
            onTouchStart={(event) => setInicioToque(event.touches[0]?.clientX ?? null)}
            onTouchEnd={(event) => {
              const fin = event.changedTouches[0]?.clientX;
              if (inicioToque !== null && fin !== undefined && Math.abs(inicioToque - fin) > 50) mover(inicioToque > fin ? 1 : -1);
              setInicioToque(null);
            }}
            onTouchCancel={() => setInicioToque(null)}>
            <div id="fila-preventas" className="fila-preventas" style={{ "--posicion": actual, "--visibles": visibles } as CSSProperties}>
              {peliculas.map((pelicula, indice) => (
                <div className="elemento-preventa" key={pelicula.id} inert={indice < actual || indice >= actual + visibles}>
                  <TarjetaPelicula pelicula={pelicula} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

export default Preventas;
