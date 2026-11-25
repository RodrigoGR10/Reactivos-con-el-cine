import {
    formatearDiaSemanaCorto,
    formatearFechaEstrenoCompacta,
} from "../../utils/formatearPeliculaDestacada";
import { fechaHoySantiago } from "../../utils/fechaSantiago";
import "./SelectorFechas.css";

/**
 * Propiedades que configuran el componente SelectorFechas.
 */
export interface SelectorFechasProps {
    /** Días con al menos una función disponible, en formato `AAAA-MM-DD`. */
    fechas: string[];
    /** Día que aparece seleccionado actualmente. */
    fechaSeleccionada: string;
    /** Callback que recibe el día elegido por la persona. */
    onSeleccionarFecha: (fecha: string) => void;
}

/** Muestra los días disponibles como pestañas y comunica la fecha elegida.
 * @param props Propiedades que determinan el contenido y las acciones del componente.
 * @returns Elemento de interfaz que representa el componente con las propiedades recibidas.
 */
export function SelectorFechas({
    fechas,
    fechaSeleccionada,
    onSeleccionarFecha,
}: SelectorFechasProps) {
    if (fechas.length === 0) return null;

    const hoyChile = fechaHoySantiago();

    return (
        <div
            className="selector-fechas-barra"
            role="tablist"
            aria-label="Seleccionar fecha de funciones"
        >
            {fechas.map((fecha) => {
                const esHoy = fecha === hoyChile;
                const diaSemana = formatearDiaSemanaCorto(fecha);
                const fechaCorta = formatearFechaEstrenoCompacta(fecha, "/");
                const esActivo = fechaSeleccionada === fecha;

                return (
                    <button
                        key={fecha}
                        type="button"
                        role="tab"
                        aria-selected={esActivo}
                        className={`fecha-segmento-btn ${esActivo ? "active" : ""}`}
                        onClick={() => onSeleccionarFecha(fecha)}
                        title={esHoy ? "Hoy" : `${diaSemana} ${fechaCorta}`}
                    >
                        {esHoy ? (
                            <span className="fecha-segmento-hoy">HOY</span>
                        ) : (
                            <>
                                <span className="fecha-segmento-dia">
                                    {diaSemana}
                                </span>
                                <span className="fecha-segmento-fecha">
                                    {fechaCorta}
                                </span>
                            </>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

export default SelectorFechas;
