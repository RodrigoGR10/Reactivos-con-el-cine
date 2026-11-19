import { useLayoutEffect, useRef, useState } from "react";
import "./SinopsisExpandible.css";

interface SinopsisExpandibleProps {
  texto: string;
}

/**
 * Limita sinopsis largas a tres líneas con desvanecimiento sutil y control inline "Ver más" / "Ver menos".
 */
export function SinopsisExpandible({ texto }: SinopsisExpandibleProps) {
  const limpio = texto.trim();
  const [expandida, setExpandida] = useState(false);
  const [truncable, setTruncable] = useState(false);
  const textoRef = useRef<HTMLParagraphElement>(null);
  const expandidaRef = useRef(expandida);

  useLayoutEffect(() => {
    expandidaRef.current = expandida;
  }, [expandida]);

  useLayoutEffect(() => {
    const el = textoRef.current;
    if (!el) return;

    let cancelado = false;
    const medir = () => {
      if (!cancelado && !expandidaRef.current) {
        setTruncable(el.scrollHeight > el.clientHeight + 2);
      }
    };

    medir();

    if (typeof document !== "undefined" && "fonts" in document) {
      void document.fonts.ready.then(medir);
    }

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", medir);
      return () => {
        cancelado = true;
        window.removeEventListener("resize", medir);
      };
    }

    const observer = new ResizeObserver(medir);
    observer.observe(el);
    return () => {
      cancelado = true;
      observer.disconnect();
    };
  }, [limpio, expandida]);

  if (!limpio) return null;

  const clasesTexto = [
    "sinopsis-detalle",
    !expandida && "sinopsis-colapsada",
    !expandida && truncable && "sinopsis-desvanecida",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="sinopsis-contenedor">
      <p ref={textoRef} className={clasesTexto}>
        {limpio}
      </p>
      {truncable && (
        <button
          type="button"
          className={`sinopsis-toggle ${
            expandida ? "sinopsis-toggle-expandida" : "sinopsis-toggle-colapsada"
          }`}
          aria-expanded={expandida}
          onClick={() => setExpandida((actual) => !actual)}
        >
          {expandida ? "Ver menos" : "Ver más"}
        </button>
      )}
    </div>
  );
}
