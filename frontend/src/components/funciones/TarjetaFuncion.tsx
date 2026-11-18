import type { Cine, Funcion, Horario, Pelicula } from "../../types/types";
import { SeatIcon } from "../common/Icons";
import "./TarjetaFuncion.css";

const cadenas: Record<string, { nombre: string; dominios: string[] }> = {
  cinemark: { nombre: "Cinemark", dominios: ["www.cinemark.cl", "cinemark.cl"] },
  cineplanet: { nombre: "Cineplanet", dominios: ["www.cineplanet.cl", "cineplanet.cl"] },
  muvix: { nombre: "Muvix", dominios: ["muvix.cl", "www.muvix.cl"] },
  cinestar: { nombre: "Cinestar", dominios: ["cinestar.cl", "www.cinestar.cl"] },
  cinepolis: {
    nombre: "Cinépolis",
    dominios: [
      "cinepolis.cl",
      "www.cinepolis.cl",
      "hoyts.cl",
      "www.hoyts.cl",
      "cinepolis.com",
      "www.cinepolis.com",
      "compra.cinepolis.com",
    ],
  },
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

type NivelDisponibilidad = "alta" | "media" | "baja" | "agotada" | "sin-total";

function obtenerNivelDisponibilidad(
  horario: Horario | undefined,
  disponibles: number,
): NivelDisponibilidad {
  const total = horario?.butacas?.total;
  const totalValido =
    typeof total === "number" && Number.isSafeInteger(total) && total >= disponibles && total > 0
      ? total
      : undefined;
  if (!totalValido) return "sin-total";

  const ocupacion = ((totalValido - disponibles) / totalValido) * 100;
  // En salas de cine el ultimo ~25% suele corresponder a filas delanteras y bordes.
  if (ocupacion >= 75) return "baja";
  if (ocupacion >= 50) return "media";
  return "alta";
}

export interface TarjetaFuncionProps {
  horario?: Horario;
  funcion?: Funcion;
  pelicula?: Pelicula;
  cine?: Cine;
  mostrarDetalle?: boolean;
}

/** Tarjeta compacta de horario con precio y disponibilidad revelados solo bajo consulta vigente (< 60 min). */
export function TarjetaFuncion({
  horario,
  funcion,
  pelicula,
  cine,
  mostrarDetalle = false,
}: TarjetaFuncionProps) {
  const hora = horario?.horario ?? funcion?.horario ?? "";
  const idioma = horario?.idioma ?? funcion?.idioma ?? "";

  const tarifa = funcion ?? horario?.tarifas?.[0];
  const formato = tarifa?.formato || horario?.formatoResumen || "2D";
  const precio = mostrarDetalle ? (tarifa?.precioOnline ?? tarifa?.precio) : undefined;
  const urlCompra = tarifa?.urlCompra ?? horario?.urlCompra;

  const butacas = mostrarDetalle ? horario?.butacas : undefined;
  const disponiblesValido =
    typeof butacas?.disponibles === "number" &&
    Number.isSafeInteger(butacas.disponibles) &&
    butacas.disponibles >= 0
      ? butacas.disponibles
      : undefined;
  const agotada =
    mostrarDetalle &&
    ((horario?.agotada ?? funcion?.agotada ?? false) || disponiblesValido === 0);

  const enlace = enlaceSeguro(urlCompra, cine?.origen);
  const cadena = cadenas[cine?.origen ?? ""]?.nombre ?? cine?.nombre ?? "Cine";
  const tituloPelicula = pelicula?.titulo ?? "Película";
  const nombreCine = cine?.nombre ?? "Cine";

  const mostrarPrecio = mostrarDetalle && !agotada && precio !== undefined;
  const mostrarDisponibilidad =
    mostrarDetalle && !agotada && disponiblesValido !== undefined;

  const nivelDisponibilidad =
    disponiblesValido !== undefined
      ? obtenerNivelDisponibilidad(horario, disponiblesValido)
      : "sin-total";

  const resumenDisponibilidad =
    disponiblesValido !== undefined
      ? `${disponiblesValido} ${disponiblesValido === 1 ? "libre" : "libres"}`
      : "";

  const etiquetaAria = `${tituloPelicula}, ${nombreCine}, ${hora} ${formato} ${idioma}${
    agotada
      ? ", agotada"
      : `${mostrarPrecio ? `, precio ${precioCLP(precio!)}` : ""}${
          mostrarDisponibilidad ? `, ${resumenDisponibilidad}` : ""
        }${
          mostrarDetalle && !mostrarPrecio && !mostrarDisponibilidad ? ", sin datos" : ""
        }`
  }`;

  const contenido = (
    <>
      <span className="tarjeta-funcion-hora">{hora}</span>
      <span className="tarjeta-funcion-detalles">
        {formato} · {idioma}
      </span>
      {mostrarDetalle && (
        <span className="tarjeta-funcion-detalle">
          {agotada ? (
            <span className="tarjeta-funcion-butacas">
              <SeatIcon size={14} className="tarjeta-funcion-icono-butaca agotada" />
              <span className="tarjeta-funcion-agotada-texto">Agotada</span>
            </span>
          ) : !mostrarPrecio && !mostrarDisponibilidad ? (
            <span className="tarjeta-funcion-sin-datos">Sin datos</span>
          ) : (
            <>
              {mostrarPrecio && (
                <span className="tarjeta-funcion-precio">{precioCLP(precio!)}</span>
              )}
              {mostrarPrecio && mostrarDisponibilidad && (
                <span className="tarjeta-funcion-separador" aria-hidden="true">
                  ·
                </span>
              )}
              {mostrarDisponibilidad && (
                <span className="tarjeta-funcion-butacas">
                  <SeatIcon
                    size={14}
                    className={`tarjeta-funcion-icono-butaca ${nivelDisponibilidad}`}
                  />
                  <span className="tarjeta-funcion-butacas-texto">
                    {resumenDisponibilidad}
                  </span>
                </span>
              )}
            </>
          )}
        </span>
      )}
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
