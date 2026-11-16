import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import type { Cine } from "../../types/types";
import cinesService from "../../services/cines";
import recomendacionesService, { type FuncionRecomendacion } from "../../services/recomendaciones";
import { obtenerComunas } from "../../utils/agruparCines";
import { normalizarTexto } from "../../utils/normalizarTexto";
import "./RecomendadorPeliculas.css";

type TipoUbicacion = "comuna" | "cine";
type Resultado = { peliculaId: string; funcion: FuncionRecomendacion; comuna: string };
type GrupoRecomendacion = { clave: string; opciones: Resultado[] };

const CANTIDAD_RECOMENDACIONES = 3;

function fechaYHoraInicial() {
  const ahora = new Date();
  const sugerida = new Date(ahora);
  sugerida.setMinutes(Math.ceil((ahora.getMinutes() + 1) / 15) * 15, 0, 0);

  const fecha = [sugerida.getFullYear(), String(sugerida.getMonth() + 1).padStart(2, "0"), String(sugerida.getDate()).padStart(2, "0")].join("-");
  const hora = `${String(sugerida.getHours()).padStart(2, "0")}:${String(sugerida.getMinutes()).padStart(2, "0")}`;
  return { fecha, hora };
}

function mezclar<T>(elementos: T[]): T[] {
  const resultado = [...elementos];
  for (let i = resultado.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [resultado[i], resultado[j]] = [resultado[j], resultado[i]];
  }
  return resultado;
}

function mostrarFechaHora(fechaHora: string): string {
  const coincidencia = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/.exec(fechaHora);
  if (!coincidencia) return fechaHora;
  const [anio, mes, dia] = coincidencia[1].split("-").map(Number);
  const fecha = new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "short", timeZone: "UTC" })
    .format(new Date(Date.UTC(anio, mes - 1, dia)));
  return `${fecha} · ${coincidencia[2]}`;
}

function RecomendadorPeliculas() {
  const inicial = useMemo(fechaYHoraInicial, []);
  const [fecha, setFecha] = useState(inicial.fecha);
  const [hora, setHora] = useState(inicial.hora);
  const [tipoUbicacion, setTipoUbicacion] = useState<TipoUbicacion>("comuna");
  const [ubicacion, setUbicacion] = useState("");
  const [cines, setCines] = useState<Cine[]>([]);
  const [cinesCargando, setCinesCargando] = useState(true);
  const [cinesError, setCinesError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [candidatas, setCandidatas] = useState<GrupoRecomendacion[]>([]);
  const [resultados, setResultados] = useState<Resultado[]>([]);
  useEffect(() => {
    let activo = true;
    cinesService.getAll()
      .then((data) => { if (activo) setCines(data); })
      .catch(() => { if (activo) setCinesError("No se pudieron cargar los cines y comunas."); })
      .finally(() => { if (activo) setCinesCargando(false); });
    return () => { activo = false; };
  }, []);

  const comunas = useMemo(() => obtenerComunas(cines), [cines]);
  const cinesPorId = useMemo(() => new Map(cines.map((cine) => [cine.id, cine])), [cines]);

  const recomendar = (pool: GrupoRecomendacion[]) => {
    const aleatorias = mezclar(pool).slice(0, CANTIDAD_RECOMENDACIONES);
    setResultados(aleatorias.map(({ opciones }) => mezclar(opciones)[0]));
  };

  const enviar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCargando(true);
    setError("");
    setResultados([]);

    try {
      const comunaSeleccionada = normalizarTexto(ubicacion.trim().replace(/\s+/g, " "));
      const cineIds = tipoUbicacion === "cine"
        ? [ubicacion]
        : cines.filter((cine) => normalizarTexto(cine.comuna.trim().replace(/\s+/g, " ")) === comunaSeleccionada).map((cine) => cine.id);
      const funciones = await recomendacionesService.getFuncionesDisponibles(fecha, hora, cineIds);

      const porPelicula = new Map<string, Resultado[]>();
      for (const funcion of funciones) {
        const claveTitulo = normalizarTexto(funcion.peliculaTitulo).replace(/[^a-z0-9]/g, "");
        const cine = cinesPorId.get(String(funcion.cineId));
        if (!cine) continue;
        const opciones = porPelicula.get(claveTitulo) ?? [];
        opciones.push({ peliculaId: String(funcion.peliculaId), funcion, comuna: cine.comuna });
        porPelicula.set(claveTitulo, opciones);
      }

      const pool = [...porPelicula.entries()].map(([clave, opciones]) => ({ clave, opciones }));
      setCandidatas(pool);
      if (pool.length === 0) {
        setError("No encontramos funciones en esa zona dentro de las tres horas siguientes. Prueba con otra fecha, hora o ubicación.");
      } else {
        recomendar(pool);
      }
    } catch {
      setError("No se pudieron consultar las funciones. Intenta nuevamente.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <section className="recomendador" aria-labelledby="titulo-recomendador">
      <div className="recomendador-encabezado">
        <p className="subtitulo-seccion">¿Qué vemos hoy?</p>
        <h2 id="titulo-recomendador">Encuentra una película al azar</h2>
        <p>Elige cuándo y dónde quieres ir. Te mostraremos películas con funciones disponibles en las tres horas siguientes.</p>
      </div>

      <form className="recomendador-formulario" onSubmit={enviar}>
        <label className="recomendador-campo">
          <span>Día</span>
          <input type="date" value={fecha} min={fechaYHoraInicial().fecha} required onChange={(event) => setFecha(event.target.value)} />
        </label>
        <label className="recomendador-campo">
          <span>Hora desde</span>
          <input type="time" value={hora} required onChange={(event) => setHora(event.target.value)} />
        </label>
        <label className="recomendador-campo">
          <span>Buscar por</span>
          <select value={tipoUbicacion} onChange={(event) => { setTipoUbicacion(event.target.value as TipoUbicacion); setUbicacion(""); }}>
            <option value="comuna">Comuna o ubicación</option>
            <option value="cine">Cine específico</option>
          </select>
        </label>
        <label className="recomendador-campo">
          <span>{tipoUbicacion === "comuna" ? "Comuna" : "Cine"}</span>
          <select value={ubicacion} required disabled={cinesCargando || Boolean(cinesError)} onChange={(event) => setUbicacion(event.target.value)}>
            <option value="" disabled>{cinesCargando ? "Cargando opciones..." : "Selecciona una opción"}</option>
            {tipoUbicacion === "comuna"
              ? comunas.map((comuna) => <option key={comuna.valor} value={comuna.valor}>{comuna.nombre}</option>)
              : cines.map((cine) => <option key={cine.id} value={cine.id}>{cine.nombre} · {cine.comuna}</option>)}
          </select>
        </label>
        <button className="recomendador-boton" type="submit" disabled={cinesCargando || Boolean(cinesError) || cargando || !ubicacion}>
          {cargando ? "Buscando..." : "Recomiéndame películas"}
        </button>
      </form>

      {cinesError && <p className="recomendador-mensaje error" role="alert">{cinesError}</p>}
      {error && <p className="recomendador-mensaje" role="status">{error}</p>}

      {resultados.length > 0 && (
        <div className="recomendador-resultados" aria-live="polite">
          <div className="recomendador-resultados-encabezado">
            <p>{resultados.length} {resultados.length === 1 ? "opción al azar" : "opciones al azar"}</p>
            {candidatas.length > resultados.length && <button type="button" onClick={() => recomendar(candidatas)}>Probar otra selección</button>}
          </div>
          <div className="recomendador-grilla">
            {resultados.map(({ peliculaId, funcion, comuna }) => (
              <article className="recomendador-tarjeta" key={peliculaId}>
                <Link className="recomendador-poster" to={`/peliculas/${peliculaId}`} aria-label={`Ver ${funcion.peliculaTitulo}`}>
                  {funcion.peliculaImagenUrl
                    ? <img src={funcion.peliculaImagenUrl} alt="" loading="lazy" />
                    : <span aria-hidden="true">🎬</span>}
                </Link>
                <div className="recomendador-detalle">
                  <p className="recomendador-etiqueta">Sugerencia al azar</p>
                  <h3><Link to={`/peliculas/${peliculaId}`}>{funcion.peliculaTitulo}</Link></h3>
                  <p className="recomendador-cine">{funcion.cineNombre}</p>
                  <p className="recomendador-comuna">{comuna}</p>
                  <time dateTime={funcion.fechaHora}>{mostrarFechaHora(funcion.fechaHora)}</time>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default RecomendadorPeliculas;
