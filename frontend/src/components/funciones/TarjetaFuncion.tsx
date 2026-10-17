import type { Cine, Funcion, Pelicula } from "../../types/types";

const cadenas: Record<string, { nombre: string; dominios: string[] }> = {
  cinemark: { nombre: "Cinemark", dominios: ["www.cinemark.cl", "cinemark.cl"] },
  cineplanet: { nombre: "Cineplanet", dominios: ["www.cineplanet.cl", "cineplanet.cl"] },
  muvix: { nombre: "Muvix", dominios: ["muvix.cl", "www.muvix.cl"] },
  cinestar: { nombre: "Cinestar", dominios: ["cinestar.cl", "www.cinestar.cl"] },
};

const precioCLP = (precio: number) => new Intl.NumberFormat("es-CL", {
  style: "currency", currency: "CLP", maximumFractionDigits: 0,
}).format(precio);

function enlaceSeguro(value: string | undefined, origen: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    const dominios = cadenas[origen ?? "cinemark"]?.dominios ?? [];
    if (url.protocol !== "https:" || !dominios.includes(url.hostname) || url.username || url.password) return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

export function TarjetaFuncion({ funcion, pelicula, cine, precioAnterior = false, consultadoEn }: { funcion: Funcion; pelicula: Pelicula; cine: Cine; precioAnterior?: boolean; consultadoEn?: string }) {
  const enlace = enlaceSeguro(funcion.urlCompra, cine.origen);
  const cadena = cadenas[cine.origen ?? "cinemark"]?.nombre ?? cine.nombre;
  const precio = funcion.precioOnline ?? funcion.precio;
  const etiqueta = `${pelicula.titulo}, ${cine.nombre}, ${funcion.fecha ?? ""} ${funcion.horario}, ${funcion.formato}, ${funcion.idioma}`;
  const contenido = (
    <>
      <strong>{funcion.horario}</strong>
      <span title={funcion.tipoEntrada}>{funcion.formato}</span>
      <span>{funcion.idioma}</span>
      <span className="precio-horario">{precio !== undefined ? precioCLP(precio) : "Precio no disponible"}</span>
      {funcion.precio === undefined && <span className="desglose-precio">Desglose no informado</span>}
      {precioAnterior && <span className="precio-anterior">Precio anterior, pendiente de actualizar</span>}
      {consultadoEn && <span className="fecha-precio">Consultado {new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Santiago" }).format(new Date(consultadoEn))}</span>}
      {funcion.precio !== undefined && funcion.cargoServicio !== undefined && funcion.cargoServicio > 0 && (
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
      aria-label={`Ver en ${cadena}: ${etiqueta} (nueva pestaña)`}
      title={`Ver en ${cadena}: ${etiqueta}`}
    >
      {contenido}
    </a>
  );
}
