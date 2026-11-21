import {
    formatearDiaSemanaCorto,
    formatearFechaEstrenoCompacta,
} from "../../utils/formatearPeliculaDestacada";
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

    const ahora = new Date();
    const hoyLocal = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}`;
    const hoyChile = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Santiago",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(ahora);

    return (
        <div
            className="selector-fechas-barra"
            role="tablist"
            aria-label="Seleccionar fecha de funciones"
        >
            {fechas.map((fecha) => {
                const esHoy = fecha === hoyLocal || fecha === hoyChile;
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
