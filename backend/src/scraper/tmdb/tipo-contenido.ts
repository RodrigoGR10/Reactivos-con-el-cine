import { sinAcentosEnMayusculas } from "../../utils/titulos.ts";
import type { TipoContenido } from "./types.ts";

const PATRONES_CONCIERTO = [
    /\b(WORLD TOUR|LIVE VIEWING|LIVE IN|LIVE CONCERT|CONCERT|CONCIERTO|TOUR)\b/,
    /\b(BTS|BLACKPINK|ENHYPEN|SEVENTEEN|TXT|TOMORROW X TOGETHER)\b/,
    /\b(OZZY|BLACK SABBATH|HYBE)\b/,
];

const PATRONES_ANIVERSARIO = [
    /\b(ANIVERSARIO|ANNIVERSARY)\b/,
    /\b\d+\s*(?:°|º)?\s*(?:ANOS|YEARS)\b/,
    /\b\d+(?:ST|ND|RD|TH)\s+ANNIVERSARY\b/,
];

const PATRONES_EVENTO = [
    /\b(BONUS|INFINITY VISION|CHEERING PARTY|SPECIAL EVENT|FAN EVENT|EXPERIENCE EVENT)\b/,
];

function coincideAlguno(patrones: RegExp[], texto: string): boolean {
    return patrones.some((patron) => patron.test(texto));
}

export function detectarTipoContenido(titulo: string): TipoContenido {
    const value = sinAcentosEnMayusculas(titulo);

    if (coincideAlguno(PATRONES_CONCIERTO, value)) return "CONCIERTO";
    if (coincideAlguno(PATRONES_ANIVERSARIO, value)) return "ANIVERSARIO";
    if (coincideAlguno(PATRONES_EVENTO, value)) return "EVENTO";

    return "DESCONOCIDO";
}
