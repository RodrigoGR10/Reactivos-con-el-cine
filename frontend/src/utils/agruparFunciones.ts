import type { Pelicula, Horario } from "../types/types";
import type { OpcionFiltro } from "../components/common/SelectorMultiple";

/**
 * Datos normalizados de una película en el modelo común de la aplicación.
 */
export interface GrupoHorariosPorPelicula {
    pelicula: Pelicula;
    horarios: Horario[];
}

function normalizarEtiquetaIdioma(raw: string): string {
    const limpio = raw.trim();
    if (!limpio) return "";
    const clave = limpio.toLowerCase();
    if (clave === "doblada" || clave === "doblado") return "Doblada";
    if (clave === "subtitulada" || clave === "subtitulado")
        return "Subtitulada";
    if (clave === "version original" || clave === "versión original") {
        return "Versión original";
    }
    return limpio.charAt(0).toUpperCase() + limpio.slice(1).toLowerCase();
}

function contarOpcionesHorario(
    horarios: readonly Horario[],
    extraerEtiqueta: (horario: Horario) => string,
): OpcionFiltro[] {
    const conteo = new Map<string, number>();
    for (const horario of horarios) {
        const etiqueta = extraerEtiqueta(horario);
        if (!etiqueta) continue;
        conteo.set(etiqueta, (conteo.get(etiqueta) ?? 0) + 1);
    }
    return [...conteo.entries()].map(([valor, cantidad]) => ({
        valor,
        nombre: valor,
        cantidad,
    }));
}

/**
 * Cuenta los formatos de sala disponibles para crear opciones de filtro.
 * @param horarios Horarios en los que se buscan formatos.
 * @returns Opciones con formato y cantidad de funciones.
 */
export function obtenerFormatosDisponibles(
    horarios: readonly Horario[],
): OpcionFiltro[] {
    return contarOpcionesHorario(horarios, (h) => h.formatoResumen || "2D");
}

/**
 * Normaliza y cuenta idiomas disponibles para crear opciones de filtro.
 * @param horarios Horarios en los que se buscan idiomas.
 * @returns Opciones de idioma ordenadas alfabéticamente y con su cantidad.
 */
export function obtenerIdiomasDisponibles(
    horarios: readonly Horario[],
): OpcionFiltro[] {
    return contarOpcionesHorario(horarios, (h) =>
        normalizarEtiquetaIdioma(h.idioma ?? ""),
    ).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

/**
 * Comprueba si un horario cumple el idioma elegido.
 * @param horario Función que se evalúa.
 * @param idioma Idioma seleccionado o `"Todos"` para no filtrar.
 * @returns `true` si el horario coincide con el filtro.
 */
export function horarioCoincideIdioma(
    horario: Horario,
    idioma: string,
): boolean {
    return (
        idioma === "Todos" ||
        normalizarEtiquetaIdioma(horario.idioma ?? "") === idioma
    );
}

/**
 * Une cada horario con su película y agrupa los horarios por película.
 * @param horarios Horarios que se van a organizar.
 * @param peliculas Catálogo para resolver el identificador del horario.
 * @returns Grupos de película con sus funciones; omite IDs sin coincidencia.
 */
export function agruparHorariosPorPelicula(
    horarios: Horario[],
    peliculas: Pelicula[],
): GrupoHorariosPorPelicula[] {
    return horarios.reduce<GrupoHorariosPorPelicula[]>((grupos, horario) => {
        const pelicula = peliculas.find((p) => p.id === horario.peliculaId);

        if (!pelicula) {
            return grupos;
        }

        const grupoExistente = grupos.find(
            (grupo) => grupo.pelicula.id === pelicula.id,
        );

        if (grupoExistente) {
            grupoExistente.horarios.push(horario);
            return grupos;
        }

        return [...grupos, { pelicula, horarios: [horario] }];
    }, []);
}
