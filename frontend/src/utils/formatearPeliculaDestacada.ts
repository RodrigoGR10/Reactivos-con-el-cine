/**
 * Reemplaza vocales acentuadas por mayúsculas sin tilde para títulos destacados.
 * @param texto Texto del título original.
 * @returns Texto con vocales sin diacríticos.
 */
export function quitarTildesTitulo(texto: string): string {
    return texto
        .replace(/[áàäâÁÀÄÂ]/g, "A")
        .replace(/[éèëêÉÈËÊ]/g, "E")
        .replace(/[íìïîÍÌÏÎ]/g, "I")
        .replace(/[óòöôÓÒÖÔ]/g, "O")
        .replace(/[úùüûÚÙÜÛ]/g, "U");
}

/**
 * Limpia adornos del título y separa título principal de subtítulo.
 * @param rawTitle Título original recibido para la película.
 * @returns Título principal y subtítulo cuando hay un separador reconocible.
 */
export function separarTituloDestacado(rawTitle: string): {
    tituloPrincipal: string;
    subtitulo?: string;
} {
    const limpio = rawTitle
        .replace(/\[[^\]]*\]|\([^)]*\)/g, "")
        .replace(/\bPT\.?\s*2\b/gi, "PARTE 2")
        .replace(/\bPT\.?\s*1\b/gi, "PARTE 1")
        .replace(/\b(BONUS|REESTRENO|PRE-?ESTRENO|INFINITY VISION)\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();

    const partes = limpio.split(/\s*:\s*|\s+[-–]\s+/);
    const tituloPrincipal = quitarTildesTitulo(partes[0]?.trim() || limpio);
    const subtitulo =
        partes.length > 1 ? partes.slice(1).join(" · ").trim() : undefined;

    return {
        tituloPrincipal,
        subtitulo: subtitulo || undefined,
    };
}

/**
 * Recorta una sinopsis procurando terminar en una oración completa.
 * @param sinopsis Texto original de la película.
 * @param maxCaracteres Límite preferido del resumen (330 por defecto).
 * @param minCaracteres Longitud mínima antes de elegir una oración completa (220 por defecto).
 * @returns Sinopsis abreviada con puntos suspensivos cuando se recorta.
 */
export function resumirSinopsisDestacada(
    sinopsis: string,
    maxCaracteres = 330,
    minCaracteres = 220,
): string {
    const texto = sinopsis.replace(/\s+/g, " ").trim();
    if (texto.length <= maxCaracteres) {
        return texto;
    }

    const oraciones = texto.match(/[^.!?]+[.!?]+/g);
    if (oraciones && oraciones.length > 0) {
        let acumulado = "";
        for (const oracion of oraciones) {
            const candidato = `${acumulado} ${oracion}`.trim();
            if (candidato.length <= maxCaracteres) {
                acumulado = candidato;
            } else {
                break;
            }
        }

        if (acumulado.length >= minCaracteres) {
            return `${acumulado.replace(/[.!?\s]+$/, "")}...`;
        }
    }

    const recorte = texto.slice(0, maxCaracteres);
    const ultimoEspacio = recorte.lastIndexOf(" ");
    const base = ultimoEspacio > 0 ? recorte.slice(0, ultimoEspacio) : recorte;
    return `${base.replace(/[.,;:\s]+$/, "")}...`;
}

interface TemporalGlobal {
    Temporal?: {
        PlainDate: {
            from: (valor: string) => {
                toLocaleString: (
                    locale: string,
                    opciones: Intl.DateTimeFormatOptions,
                ) => string;
            };
        };
    };
}

function parsearFechaCalendarioUtc(fecha: string): Date | null {
    const coincidencia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
    if (!coincidencia) return null;

    const [, anio, mes, dia] = coincidencia;
    const fechaUtc = new Date(
        Date.UTC(Number(anio), Number(mes) - 1, Number(dia)),
    );
    return Number.isNaN(fechaUtc.getTime()) ? null : fechaUtc;
}

function formatearAbreviaturaEs(
    fechaUtc: Date,
    opciones: Intl.DateTimeFormatOptions,
): string {
    return new Intl.DateTimeFormat("es-CL", { ...opciones, timeZone: "UTC" })
        .format(fechaUtc)
        .replace(/\.$/, "")
        .toUpperCase();
}

/**
 * Formatea una fecha ISO como día y mes completos sin desfase horario.
 * @param fechaEstreno Fecha en formato `AAAA-MM-DD`.
 * @returns Fecha localizada en español o el texto original si no es válida.
 */
export function formatearFechaEstrenoCorta(fechaEstreno: string): string {
    const temporal = (globalThis as TemporalGlobal).Temporal;
    if (temporal) {
        try {
            return temporal.PlainDate.from(fechaEstreno).toLocaleString(
                "es-CL",
                {
                    day: "numeric",
                    month: "long",
                },
            );
        } catch {
            // Si la cadena no cumple ISO estricto, se intenta el respaldo con Date.UTC.
        }
    }

    const fechaUtc = parsearFechaCalendarioUtc(fechaEstreno);
    if (!fechaUtc) return fechaEstreno;

    return new Intl.DateTimeFormat("es-CL", {
        day: "numeric",
        month: "long",
        timeZone: "UTC",
    }).format(fechaUtc);
}

/**
 * Formatea una fecha ISO como día y mes abreviado en mayúsculas.
 * @param fechaEstreno Fecha en formato `AAAA-MM-DD`.
 * @param separador Texto entre día y mes; por defecto es un espacio.
 * @returns Fecha abreviada, por ejemplo `16 DIC`.
 */
export function formatearFechaEstrenoCompacta(
    fechaEstreno: string,
    separador = " ",
): string {
    const fechaUtc = parsearFechaCalendarioUtc(fechaEstreno);
    if (!fechaUtc) return fechaEstreno;

    const dia = fechaUtc.getUTCDate();
    const mes = formatearAbreviaturaEs(fechaUtc, { month: "short" });
    return `${dia}${separador}${mes}`;
}

/**
 * Formatea una fecha ISO como día de semana abreviado en español.
 * @param fecha Fecha en formato `AAAA-MM-DD`.
 * @returns Día de semana, o cadena vacía si la fecha no es válida.
 */
export function formatearDiaSemanaCorto(fecha: string): string {
    const fechaUtc = parsearFechaCalendarioUtc(fecha);
    if (!fechaUtc) return "";

    return formatearAbreviaturaEs(fechaUtc, { weekday: "short" });
}
