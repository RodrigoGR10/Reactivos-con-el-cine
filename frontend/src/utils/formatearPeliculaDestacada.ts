export function quitarTildesTitulo(texto: string): string {
  return texto
    .replace(/[áàäâÁÀÄÂ]/g, "A")
    .replace(/[éèëêÉÈËÊ]/g, "E")
    .replace(/[íìïîÍÌÏÎ]/g, "I")
    .replace(/[óòöôÓÒÖÔ]/g, "O")
    .replace(/[úùüûÚÙÜÛ]/g, "U");
}

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

/** Formatea una fecha calendario ISO (YYYY-MM-DD) como día y mes completo sin desfase horario. */
export function formatearFechaEstrenoCorta(fechaEstreno: string): string {
  const temporal = (globalThis as TemporalGlobal).Temporal;
  if (temporal) {
    try {
      return temporal.PlainDate.from(fechaEstreno).toLocaleString("es-CL", {
        day: "numeric",
        month: "long",
      });
    } catch {
      // Si la cadena no cumple ISO estricto, se intenta el respaldo con Date.UTC.
    }
  }

  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fechaEstreno);
  if (!coincidencia) return fechaEstreno;

  const [, anio, mes, dia] = coincidencia;
  const fechaUtc = new Date(
    Date.UTC(Number(anio), Number(mes) - 1, Number(dia)),
  );
  if (Number.isNaN(fechaUtc.getTime())) return fechaEstreno;

  return new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(fechaUtc);
}
