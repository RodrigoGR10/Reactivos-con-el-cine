import { Skeleton } from "@mantine/core";
import type { Cine, Funcion, Horario, Pelicula } from "../../types/types";
import { SeatIcon } from "../common/Icons";
import {
    nombreCadena,
    obtenerEnlaceCompraSeguro,
} from "../../utils/enlaceCompra";
import "./TarjetaFuncion.css";

const precioCLP = (precio: number) =>
    new Intl.NumberFormat("es-CL", {
        style: "currency",
        currency: "CLP",
        maximumFractionDigits: 0,
    }).format(precio);

type NivelDisponibilidad = "alta" | "media" | "baja" | "agotada" | "sin-total";

function obtenerNivelDisponibilidad(
    horario: Horario | undefined,
    disponibles: number,
): NivelDisponibilidad {
    const total = horario?.butacas?.total;
    const totalValido =
        typeof total === "number" &&
        Number.isSafeInteger(total) &&
        total >= disponibles &&
        total > 0
            ? total
            : undefined;
    if (!totalValido) return "sin-total";

    const ocupacion = ((totalValido - disponibles) / totalValido) * 100;
    // En salas de cine el ultimo ~25% suele corresponder a filas delanteras y bordes.
    if (ocupacion >= 75) return "baja";
    if (ocupacion >= 50) return "media";
    return "alta";
}

/** Propiedades para presentar una función y, opcionalmente, sus datos vigentes. */
export interface TarjetaFuncionProps {
    horario?: Horario;
    funcion?: Funcion;
    pelicula?: Pelicula;
    cine?: Cine;
    mostrarDetalle?: boolean;
    /** Muestra placeholders en los datos que aun no llegan de la consulta en curso. */
    cargando?: boolean;
}

/** Placeholder del tamano aproximado de un dato de la tarjeta. */
function DatoPendiente({ ancho }: { ancho: number }) {
    return (
        <Skeleton
            className="tarjeta-funcion-pendiente"
            height={10}
            width={ancho}
            radius="sm"
        />
    );
}

/** Tarjeta compacta de horario con precio y disponibilidad revelados solo bajo consulta vigente (< 60 min). */
/**
 * Presenta una función y activa el enlace de compra solo si hay URL segura.
 * @param props Horario y datos de contexto; `mostrarDetalle` habilita precios y butacas.
 * @returns Elemento de interfaz que representa el componente con las propiedades recibidas.
 */
export function TarjetaFuncion({
    horario,
    funcion,
    pelicula,
    cine,
    mostrarDetalle = false,
    cargando = false,
}: TarjetaFuncionProps) {
    const hora = horario?.horario ?? funcion?.horario ?? "";
    const idioma = horario?.idioma ?? funcion?.idioma ?? "";

    const tarifa = funcion ?? horario?.tarifas?.[0];
    const formato = tarifa?.formato || horario?.formatoResumen || "2D";
    const precio = mostrarDetalle
        ? (tarifa?.precioOnline ?? tarifa?.precio)
        : undefined;
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
        ((horario?.agotada ?? funcion?.agotada ?? false) ||
            disponiblesValido === 0);

    const enlace = obtenerEnlaceCompraSeguro(urlCompra, cine?.origen);
    const cadena = nombreCadena(cine?.origen, cine?.nombre ?? "Cine");
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
            : `${mostrarDisponibilidad ? `, ${resumenDisponibilidad}` : ""}${
                  mostrarPrecio ? `, precio ${precioCLP(precio!)}` : ""
              }${
                  cargando
                      ? ", consultando detalle"
                      : mostrarDetalle &&
                          !mostrarPrecio &&
                          !mostrarDisponibilidad
                        ? ", sin datos"
                        : ""
              }`
    }`;
    const contenido = (
        <>
            <span className="tarjeta-funcion-hora">{hora}</span>
            <span className="tarjeta-funcion-detalles">
                {formato} · {idioma}
            </span>
            {mostrarDetalle && (
                <div className="tarjeta-funcion-detalle">
                    {agotada ? (
                        <span className="tarjeta-funcion-butacas">
                            <SeatIcon
                                size={14}
                                className="tarjeta-funcion-icono-butaca agotada"
                            />
                            <span className="tarjeta-funcion-agotada-texto">
                                Agotada
                            </span>
                        </span>
                    ) : !mostrarPrecio &&
                      !mostrarDisponibilidad &&
                      !cargando ? (
                        <span className="tarjeta-funcion-sin-datos">
                            Sin datos
                        </span>
                    ) : (
                        <>
                            {mostrarDisponibilidad ? (
                                <span className="tarjeta-funcion-butacas">
                                    <SeatIcon
                                        size={14}
                                        className={`tarjeta-funcion-icono-butaca ${nivelDisponibilidad}`}
                                    />
                                    <span className="tarjeta-funcion-butacas-texto">
                                        {resumenDisponibilidad}
                                    </span>
                                </span>
                            ) : (
                                cargando && <DatoPendiente ancho={62} />
                            )}
                            {(mostrarDisponibilidad || cargando) &&
                                (mostrarPrecio || cargando) && (
                                    <span
                                        className="tarjeta-funcion-separador"
                                        aria-hidden="true"
                                    >
                                        ·
                                    </span>
                                )}
                            {mostrarPrecio ? (
                                <span className="tarjeta-funcion-precio">
                                    {precioCLP(precio!)}
                                </span>
                            ) : (
                                cargando && <DatoPendiente ancho={54} />
                            )}
                        </>
                    )}
                </div>
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
