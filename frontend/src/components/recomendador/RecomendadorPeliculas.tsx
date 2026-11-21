import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Alert, Badge, Button } from "@mantine/core";
import type { Cine } from "../../types/types";
import cinesService from "../../services/cines";
import recomendacionesService, {
    type FuncionRecomendacion,
} from "../../services/recomendaciones";
import { AlertCircleIcon } from "../common/Icons";
import { SelectorUnico, type OpcionFiltro } from "../common/SelectorMultiple";
import { obtenerComunas } from "../../utils/agruparCines";
import { fechaHoySantiago } from "../../utils/fechaSantiago";
import { normalizarTexto } from "../../utils/normalizarTexto";
import "./RecomendadorPeliculas.css";

type TipoUbicacion = "comuna" | "cine";
type Resultado = {
    peliculaId: string;
    funcion: FuncionRecomendacion;
    comuna: string;
};
type GrupoRecomendacion = { clave: string; opciones: Resultado[] };

const CANTIDAD_RECOMENDACIONES = 3;

const formatoHora = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Santiago",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
});

function fechaYHoraInicial() {
    const cuartoDeHora = 15 * 60_000;
    const siguienteCuarto =
        (Math.floor(Date.now() / cuartoDeHora) + 1) * cuartoDeHora;
    const sugerida = new Date(siguienteCuarto);
    return {
        fecha: fechaHoySantiago(sugerida),
        hora: formatoHora.format(sugerida),
    };
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
    const coincidencia = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/.exec(
        fechaHora,
    );
    if (!coincidencia) return fechaHora;
    const [anio, mes, dia] = coincidencia[1].split("-").map(Number);
    const fecha = new Intl.DateTimeFormat("es-CL", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
    }).format(new Date(Date.UTC(anio, mes - 1, dia)));
    return `${fecha} · ${coincidencia[2]}`;
}

function RecomendadorPeliculas() {
    const inicial = useMemo(() => fechaYHoraInicial(), []);
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
        cinesService
            .getAll()
            .then((data) => {
                if (activo) setCines(data);
            })
            .catch(() => {
                if (activo)
                    setCinesError("No se pudieron cargar los cines y comunas.");
            })
            .finally(() => {
                if (activo) setCinesCargando(false);
            });
        return () => {
            activo = false;
        };
    }, []);

    const comunas = useMemo(() => obtenerComunas(cines), [cines]);
    const cinesPorId = useMemo(
        () => new Map(cines.map((cine) => [cine.id, cine])),
        [cines],
    );
    const opcionesTipoUbicacion: OpcionFiltro[] = [
        { valor: "comuna", nombre: "Comuna", cantidad: 1 },
        { valor: "cine", nombre: "Cine", cantidad: 1 },
    ];
    const opcionesUbicacion = useMemo<OpcionFiltro[]>(
        () =>
            tipoUbicacion === "comuna"
                ? comunas
                : cines.map((cine) => ({
                      valor: cine.id,
                      nombre: `${cine.nombre} · ${cine.comuna}`,
                      cantidad: 1,
                  })),
        [tipoUbicacion, comunas, cines],
    );

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
            const comunaSeleccionada = normalizarTexto(
                ubicacion.trim().replace(/\s+/g, " "),
            );
            const cineIds =
                tipoUbicacion === "cine"
                    ? [ubicacion]
                    : cines
                          .filter(
                              (cine) =>
                                  normalizarTexto(
                                      cine.comuna.trim().replace(/\s+/g, " "),
                                  ) === comunaSeleccionada,
                          )
                          .map((cine) => cine.id);
            const funciones =
                await recomendacionesService.getFuncionesDisponibles(
                    fecha,
                    hora,
                    cineIds,
                );

            const porPelicula = new Map<string, Resultado[]>();
            for (const funcion of funciones) {
                const claveTitulo = normalizarTexto(
                    funcion.peliculaTitulo,
                ).replace(/[^a-z0-9]/g, "");
                const cine = cinesPorId.get(String(funcion.cineId));
                if (!cine) continue;
                const opciones = porPelicula.get(claveTitulo) ?? [];
                opciones.push({
                    peliculaId: String(funcion.peliculaId),
                    funcion,
                    comuna: cine.comuna,
                });
                porPelicula.set(claveTitulo, opciones);
            }

            const pool = [...porPelicula.entries()].map(
                ([clave, opciones]) => ({ clave, opciones }),
            );
            setCandidatas(pool);
            if (pool.length === 0) {
                setError(
                    "No encontramos funciones en esa zona dentro de las tres horas siguientes. Prueba con otra fecha, hora o ubicación.",
                );
            } else {
                recomendar(pool);
            }
        } catch {
            setError(
                "No se pudieron consultar las funciones. Intenta nuevamente.",
            );
        } finally {
            setCargando(false);
        }
    };

    return (
        <section className="recomendador" aria-labelledby="titulo-recomendador">
            <div className="recomendador-encabezado">
                <p className="subtitulo-seccion">¿Qué vemos hoy?</p>
                <h2 id="titulo-recomendador">Encuentra una película al azar</h2>
                <p>
                    Elige cuándo y dónde quieres ir. Te mostraremos películas
                    con funciones disponibles en las tres horas siguientes.
                </p>
            </div>

            <form className="recomendador-formulario" onSubmit={enviar}>
                <label className="recomendador-campo">
                    <span>Día</span>
                    <input
                        type="date"
                        value={fecha}
                        min={fechaYHoraInicial().fecha}
                        required
                        onChange={(event) => {
                            setFecha(event.target.value);
                            setResultados([]);
                        }}
                    />
                </label>
                <label className="recomendador-campo">
                    <span>Hora desde</span>
                    <input
                        type="time"
                        value={hora}
                        required
                        onChange={(event) => {
                            setHora(event.target.value);
                            setResultados([]);
                        }}
                    />
                </label>
                <div className="recomendador-campo">
                    <span>Buscar por</span>
                    <SelectorUnico
                        className="recomendador-selector"
                        opciones={opcionesTipoUbicacion}
                        seleccionada={tipoUbicacion}
                        onChange={(valor) => {
                            setTipoUbicacion(valor as TipoUbicacion);
                            setUbicacion("");
                            setResultados([]);
                        }}
                        titulo="Buscar por"
                        etiquetaVacia="Selecciona dónde buscar"
                        ariaLabelPrefijo="Buscar por"
                        mostrarCantidad={false}
                        deseleccionable={false}
                    />
                </div>
                <div className="recomendador-campo">
                    <span>
                        {tipoUbicacion === "comuna" ? "Comuna" : "Cine"}
                    </span>
                    <SelectorUnico
                        className="recomendador-selector"
                        opciones={opcionesUbicacion}
                        seleccionada={ubicacion}
                        onChange={(valor) => {
                            setUbicacion(valor);
                            setResultados([]);
                        }}
                        titulo={
                            tipoUbicacion === "comuna" ? "Comunas" : "Cines"
                        }
                        etiquetaVacia={
                            cinesCargando
                                ? "Cargando opciones..."
                                : "Selecciona una opción"
                        }
                        ariaLabelPrefijo={
                            tipoUbicacion === "comuna"
                                ? "Seleccionar comuna"
                                : "Seleccionar cine"
                        }
                        conBusqueda
                        placeholderBusqueda={
                            tipoUbicacion === "comuna"
                                ? "Buscar comuna..."
                                : "Buscar cine..."
                        }
                        mensajeVacio={
                            tipoUbicacion === "comuna"
                                ? "No se encontraron comunas."
                                : "No se encontraron cines."
                        }
                        mostrarCantidad={tipoUbicacion === "comuna"}
                        disabled={cinesCargando || Boolean(cinesError)}
                    />
                </div>
                <Button
                    type="submit"
                    color="cine"
                    radius={10}
                    h={46}
                    px={18}
                    fz="1rem"
                    fw={700}
                    loading={cargando}
                    disabled={
                        cinesCargando || Boolean(cinesError) || !ubicacion
                    }
                    className="recomendador-boton"
                >
                    {cargando ? "Buscando..." : "Recomiéndame películas"}
                </Button>
            </form>

            {cinesError && (
                <Alert
                    variant="light"
                    color="cine"
                    radius="md"
                    icon={<AlertCircleIcon size={18} />}
                    role="alert"
                    className="recomendador-alerta recomendador-alerta--error"
                >
                    {cinesError}
                </Alert>
            )}
            {error && (
                <Alert
                    variant="default"
                    radius="md"
                    role="status"
                    className="recomendador-alerta"
                >
                    {error}
                </Alert>
            )}

            {resultados.length > 0 && (
                <div className="recomendador-resultados" aria-live="polite">
                    <div className="recomendador-resultados-encabezado">
                        <p>
                            {resultados.length}{" "}
                            {resultados.length === 1
                                ? "opción al azar"
                                : "opciones al azar"}
                        </p>
                        {candidatas.length > resultados.length && (
                            <Button
                                type="button"
                                variant="default"
                                radius="md"
                                size="sm"
                                onClick={() => recomendar(candidatas)}
                            >
                                Probar otra selección
                            </Button>
                        )}
                    </div>
                    <div className="recomendador-grilla">
                        {resultados.map(({ peliculaId, funcion, comuna }) => {
                            const detallesFuncion = [
                                funcion.formato,
                                funcion.idioma,
                            ]
                                .filter(Boolean)
                                .join(" · ");
                            const parametrosDetalle = new URLSearchParams({
                                fecha: funcion.fechaHora.slice(0, 10),
                                cineId: String(funcion.cineId),
                            });
                            const contenidoTarjeta = (
                                <>
                                    <span
                                        className="recomendador-poster"
                                        aria-hidden="true"
                                    >
                                        {funcion.peliculaImagenUrl ? (
                                            <img
                                                src={funcion.peliculaImagenUrl}
                                                alt=""
                                                loading="lazy"
                                            />
                                        ) : (
                                            <span>🎬</span>
                                        )}
                                    </span>
                                    <span className="recomendador-detalle">
                                        <Badge
                                            size="xs"
                                            variant="light"
                                            color="cine"
                                            radius="sm"
                                            className="recomendador-etiqueta"
                                        >
                                            Sugerencia al azar
                                        </Badge>
                                        <span className="recomendador-titulo">
                                            {funcion.peliculaTitulo}
                                        </span>
                                        <span className="recomendador-cine">
                                            {funcion.cineNombre}
                                        </span>
                                        <span className="recomendador-comuna">
                                            {comuna}
                                        </span>
                                        {detallesFuncion && (
                                            <span className="recomendador-formato">
                                                {detallesFuncion}
                                            </span>
                                        )}
                                        <time dateTime={funcion.fechaHora}>
                                            {mostrarFechaHora(
                                                funcion.fechaHora,
                                            )}
                                        </time>
                                        <span className="recomendador-accion">
                                            Ver función en detalle
                                        </span>
                                    </span>
                                </>
                            );

                            return (
                                <article
                                    className="recomendador-tarjeta"
                                    key={`${peliculaId}-${funcion.id}`}
                                >
                                    <Link
                                        className="recomendador-tarjeta-enlace"
                                        to={`/peliculas/${peliculaId}?${parametrosDetalle.toString()}`}
                                        aria-label={`Ver detalles de ${funcion.peliculaTitulo} con la función de ${funcion.cineNombre} a las ${mostrarFechaHora(funcion.fechaHora)}`}
                                    >
                                        {contenidoTarjeta}
                                    </Link>
                                </article>
                            );
                        })}
                    </div>
                </div>
            )}
        </section>
    );
}

export default RecomendadorPeliculas;
