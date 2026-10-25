import type { Horario } from "../../types/types";
import { useEffect, useState } from "react";
import "./ButacasFuncion.css";

export function ButacasFuncion({ horario }: { horario: Horario }) {
  const datos = horario.butacas;
  const consultadas = Date.parse(datos?.consultadasEn ?? "");
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    if (!Number.isFinite(consultadas)) return;
    const timer = setTimeout(() => setAhora(Date.now()), Math.max(1, consultadas + 120_000 - Date.now()));
    return () => clearTimeout(timer);
  }, [consultadas]);
  const disponibles = datos?.disponibles;
  const valido = typeof disponibles === "number" && Number.isSafeInteger(disponibles) && disponibles >= 0;
  if (!valido || !datos) {
    const texto = horario.estadoButacas === "error" ? "Error al consultar butacas"
      : horario.estadoButacas === "sin_datos" ? "Sin datos de butacas" : "Butacas sin consultar";
    return <span className="butacas-funcion sin-datos">{texto}</span>;
  }
  const total = datos.total && Number.isSafeInteger(datos.total) && datos.total >= disponibles ? datos.total : undefined;
  const porcentaje = total ? Math.round((1 - disponibles / total) * 1000) / 10 : undefined;
  const antiguas = !Number.isFinite(consultadas) || horario.estadoButacas === "error" || horario.estadoButacas === "desactualizado" || ahora - consultadas >= 120_000;
  const nivel = antiguas ? "anterior" : disponibles === 0 ? "baja" : porcentaje === undefined ? "sin-total" : porcentaje >= 85 ? "baja" : porcentaje >= 60 ? "media" : "alta";
  const hora = Number.isFinite(consultadas) ? new Intl.DateTimeFormat("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Santiago" }).format(new Date(consultadas)) : "sin hora";
  const etiqueta = total ? `${disponibles} de ${total} libres` : `${disponibles} ${disponibles === 1 ? "butaca libre" : "butacas libres"}`;
  const detalle = `${antiguas ? "Dato anterior. " : ""}Consultado a las ${hora}.`;
  return <span className={`butacas-funcion ${nivel}`} title={detalle}>
    <span className="butacas-funcion-cantidad">{antiguas ? "Última consulta: " : ""}{etiqueta}</span>
    {porcentaje !== undefined && <span className="butacas-funcion-barra" role="meter" aria-label="Butacas no disponibles" aria-valuemin={0} aria-valuemax={100} aria-valuenow={porcentaje} aria-valuetext={`${porcentaje}% no disponible; ${etiqueta}`}>
      <span style={{ width: `${porcentaje}%` }} />
    </span>}
    <span className="butacas-funcion-hora">{porcentaje !== undefined ? `${porcentaje}% no disponible · ` : ""}{hora}</span>
  </span>;
}
