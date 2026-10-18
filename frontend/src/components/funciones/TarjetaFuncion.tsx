import type { Cine, Funcion, Horario, Pelicula } from "../../types/types";
import "./TarjetaFuncion.css";

const cadenas: Record<string, { nombre: string; dominios: string[] }> = {
  cinemark: { nombre: "Cinemark", dominios: ["www.cinemark.cl", "cinemark.cl"] },
  cineplanet: { nombre: "Cineplanet", dominios: ["www.cineplanet.cl", "cineplanet.cl"] },
  muvix: { nombre: "Muvix", dominios: ["muvix.cl", "www.muvix.cl"] },
  cinestar: { nombre: "Cinestar", dominios: ["cinestar.cl", "www.cinestar.cl"] },
  cinepolis: { nombre: "Cinépolis", dominios: ["cinepolis.cl", "www.cinepolis.cl", "hoyts.cl", "www.hoyts.cl"] },
};

const precioCLP = (precio: number) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(precio);

function enlaceSeguro(value: string | undefined, origen: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return undefined;
    const dominios = cadenas[origen ?? ""]?.dominios;
    if (dominios && !dominios.includes(url.hostname)) return undefined;
    if (url.username || url.password) return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

export interface TarjetaFuncionProps {
  horario?: Horario;
  funcion?: Funcion;
  pelicula?: Pelicula;
  cine?: Cine;
  precioAnterior?: boolean;
  consultadoEn?: string;
}

export function TarjetaFuncion({ horario, funcion, pelicula, cine }: TarjetaFuncionProps) {
  const hora = horario?.horario ?? funcion?.horario ?? "";
  const formato = horario?.formatoResumen || funcion?.formato || "2D";
  const idioma = horario?.idioma ?? funcion?.idioma ?? "";
  const agotada = horario?.agotada ?? funcion?.agotada ?? false;

  const tarifa = horario?.tarifas?.[0];
  const precio = funcion?.precioOnline ?? funcion?.precio ?? tarifa?.precioOnline ?? tarifa?.precio;
  const urlCompra = funcion?.urlCompra ?? tarifa?.urlCompra;

  const enlace = enlaceSeguro(urlCompra, cine?.origen);
  const cadena = cadenas[cine?.origen ?? ""]?.nombre ?? cine?.nombre ?? "Cine";
  const tituloPelicula = pelicula?.titulo ?? "Película";
  const nombreCine = cine?.nombre ?? "Cine";

  const etiquetaAria = `${tituloPelicula}, ${nombreCine}, ${hora} ${formato} ${idioma}${
    precio !== undefined ? `, precio ${precioCLP(precio)}` : ""
  }`;

  const contenido = (
    <>
      <span className="tarjeta-funcion-hora">{hora}</span>
      <span className="tarjeta-funcion-detalles">
        {formato} · {idioma}
      </span>
      <span
        className={`tarjeta-funcion-precio ${agotada ? "agotada" : ""}`}
        aria-hidden={precio === undefined && !agotada}
      >
        {agotada ? "Agotada" : precio !== undefined ? precioCLP(precio) : "\u00A0"}
      </span>
    </>
  );

  if (!enlace || agotada) {
    return (
      <div
        className="tarjeta-funcion tarjeta-funcion-inactiva"
        aria-label={etiquetaAria}
        title={agotada ? "Función agotada" : undefined}
      >
        {contenido}
      </div>
    );
  }

  return (
    <a
      href={enlace}
      target="_blank"
      rel="noopener noreferrer"
      className="tarjeta-funcion"
      aria-label={`Comprar en ${cadena}: ${etiquetaAria} (abre en nueva pestaña)`}
      title={`Comprar en ${cadena}`}
    >
      {contenido}
    </a>
  );
}

export default TarjetaFuncion;
