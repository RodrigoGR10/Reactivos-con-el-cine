import type { Cine, Funcion, Pelicula } from "../../types/types";

const precioCLP = (precio: number) => new Intl.NumberFormat("es-CL", {
  style: "currency", currency: "CLP", maximumFractionDigits: 0,
}).format(precio);

function enlaceSeguro(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !["www.cinemark.cl", "cinemark.cl"].includes(url.hostname) || url.username || url.password) return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

export function TarjetaFuncion({ funcion, pelicula, cine }: { funcion: Funcion; pelicula: Pelicula; cine: Cine }) {
  const enlace = enlaceSeguro(funcion.urlCompra);
  const etiqueta = `${pelicula.titulo}, ${cine.nombre}, ${funcion.fecha ?? ""} ${funcion.horario}, ${funcion.formato}, ${funcion.idioma}`;
  const contenido = (
    <>
      <strong>{funcion.horario}</strong>
      <span title={funcion.tipoEntrada}>{funcion.formato}</span>
      <span>{funcion.idioma}</span>
      {funcion.sala && <span>Sala {funcion.sala}</span>}
      <span className="precio-horario">{precioCLP(funcion.precioOnline ?? funcion.precio)}</span>
      {funcion.cargoServicio !== undefined && funcion.cargoServicio > 0 && (
        <span className="desglose-precio">
          Entrada {precioCLP(funcion.precio)} + servicio {precioCLP(funcion.cargoServicio)}
        </span>
      )}
      {funcion.agotada && <span>Agotada</span>}
    </>
  );

  if (!enlace || funcion.agotada) {
    return (
      <div className="tarjeta-horario tarjeta-horario-inactiva" aria-disabled="true" title={funcion.agotada ? "Función agotada" : "Sin enlace disponible"}>
        {contenido}
      </div>
    );
  }

  return (
    <a
      href={enlace}
      target="_blank"
      rel="noopener noreferrer"
      className="tarjeta-horario"
      aria-label={`Ver en Cinemark: ${etiqueta} (nueva pestaña)`}
      title={`Ver en Cinemark: ${etiqueta}. Selecciona allí el horario y la entrada.`}
    >
      {contenido}
    </a>
  );
}
