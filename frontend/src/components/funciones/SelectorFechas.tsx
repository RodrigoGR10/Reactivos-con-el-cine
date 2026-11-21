import {
    formatearDiaSemanaCorto,
    formatearFechaEstrenoCompacta,
} from "../../utils/formatearPeliculaDestacada";
import { fechaHoySantiago } from "../../utils/fechaSantiago";
import "./SelectorFechas.css";

export interface SelectorFechasProps {
    fechas: string[];
    fechaSeleccionada: string;
    onSeleccionarFecha: (fecha: string) => void;
}

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
