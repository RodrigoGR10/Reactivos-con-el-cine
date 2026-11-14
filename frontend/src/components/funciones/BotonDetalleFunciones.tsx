import "./BotonDetalleFunciones.css";

interface BotonDetalleFuncionesProps {
  cargando: boolean;
  enCooldown: boolean;
  tiempoRelativo: string | null;
  avisoError: string | null;
  contexto: string;
  onConsultar: () => void;
}

/** Cabecera derecha para consultar detalle, mostrar timestamp relativo o avisos y respetar cooldown. */
export function BotonDetalleFunciones({
  cargando,
  enCooldown,
  tiempoRelativo,
  avisoError,
  contexto,
  onConsultar,
}: BotonDetalleFuncionesProps) {
  const textoVisible = cargando ? "Consultando..." : "Consultar detalle";
  const deshabilitado = cargando || enCooldown;

  return (
    <div className="funciones-acciones">
      {(avisoError || tiempoRelativo) && (
        <p className="detalle-estado-meta">
          {avisoError && (
            <>
              <span className="detalle-estado-alerta" role="alert">
                {avisoError}
              </span>
              {tiempoRelativo && (
                <span className="detalle-estado-separador" aria-hidden="true">
                  {" · "}
                </span>
              )}
            </>
          )}
          {tiempoRelativo && (
            <span className="detalle-estado-tiempo">{tiempoRelativo}</span>
          )}
        </p>
      )}
      <button
        type="button"
        className="btn-consultar-detalle"
        disabled={deshabilitado}
        aria-busy={cargando || undefined}
        aria-label={`${textoVisible} para ${contexto}`}
        title={
          enCooldown && !cargando
            ? "Detalle actualizado recientemente"
            : "Consultar precio y disponibilidad"
        }
        onClick={onConsultar}
      >
        {textoVisible}
      </button>
    </div>
  );
}
