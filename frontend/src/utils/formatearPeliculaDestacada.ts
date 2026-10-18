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
