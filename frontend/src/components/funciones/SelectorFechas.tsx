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
        const [year, month, day] = fecha.split("-").map(Number);
        const fechaObj = new Date(year, month - 1, day);

        const esHoy = fecha === hoyLocal || fecha === hoyChile;

        const diaSemana = new Intl.DateTimeFormat("es-CL", { weekday: "short" })
          .format(fechaObj)
          .replace(".", "")
          .toUpperCase();

        const mes = new Intl.DateTimeFormat("es-CL", { month: "short" })
          .format(fechaObj)
          .replace(".", "")
          .toUpperCase();

        const esActivo = fechaSeleccionada === fecha;

        return (
          <button
            key={fecha}
            type="button"
            role="tab"
            aria-selected={esActivo}
            className={`fecha-segmento-btn ${esActivo ? "active" : ""}`}
            onClick={() => onSeleccionarFecha(fecha)}
            title={esHoy ? "Hoy" : `${diaSemana} ${day}/${mes}`}
          >
            {esHoy ? (
              <span className="fecha-segmento-hoy">HOY</span>
            ) : (
              <>
                <span className="fecha-segmento-dia">{diaSemana}</span>
                <span className="fecha-segmento-fecha">
                  {day}/{mes}
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
