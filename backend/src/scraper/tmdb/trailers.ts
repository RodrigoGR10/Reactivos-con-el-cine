import { normalizarTrailerUrl } from "../../utils/trailer.ts";
import { parseMovieTitleForSearch } from "./consulta.ts";
import { claveBasica, sinAcentosEnMayusculas } from "../../utils/titulos.ts";

export type VersionTrailerLatino = "doblado" | "original";

export interface VideoTrailer {
    key: string;
    site: string;
    type: string;
    name: string;
    iso_639_1?: string;
    iso_3166_1?: string;
    official?: boolean;
    published_at?: string;
}

export interface PeliculaConVideos {
    title?: string;
    original_title?: string;
    original_language?: string;
    origin_country?: string[];
    production_countries?: { iso_3166_1: string }[];
    videos?: { results?: VideoTrailer[] };
}

export interface TrailerLatino {
    url: string;
    version: VersionTrailerLatino;
}

export interface MetadatosYoutube {
    title?: string;
    author_name?: string;
    author_url?: string;
}

const PAISES_LATINOS = new Set([
    "MX", "AR", "CL", "CO", "PE", "VE", "EC", "BO", "PY", "UY",
    "CR", "PA", "SV", "GT", "HN", "NI", "DO", "CU", "PR",
]);
const SUBTITULADO = /\b(SUBTITULAD[OA]S?|SUBTITULOS|SUB|SUBBED|SUBTITLED)\b/;
const NO_LATINO = /\b(CASTELLANO|ESPANA|IBERICO)\b/;
const NO_TRAILER = /\b(CONCEPT|CONCEPTO|FANMADE|FAN MADE|REACCION|REACTION|ANALISIS|RESUMEN|ESCENA|ESCENAS|CLIP|CLIPS)\b/;
const LATINO = /\b(LATINO|LATINA|LATINOAMERICANO|LATINOAMERICA|LATAM)\b/;
const DOBLADO = /\b(DOBLAD[OA]|DUBBED|DOBLAJE)\b/;

export function esVersionLatina(version: unknown): version is VersionTrailerLatino {
    return version === "doblado" || version === "original";
}

export function versionLatinaConfirmada(
    nombre: string,
    pelicula: PeliculaConVideos,
    pais?: string,
): VersionTrailerLatino | undefined {
    const texto = sinAcentosEnMayusculas(nombre);
    if (SUBTITULADO.test(texto) || NO_LATINO.test(texto) || NO_TRAILER.test(texto) || pais === "ES") {
        return undefined;
    }

    const paisLatino = PAISES_LATINOS.has(pais ?? "");
    if (LATINO.test(texto) || (paisLatino && DOBLADO.test(texto))) return "doblado";

    const origenes = pelicula.origin_country?.length
        ? pelicula.origin_country : pelicula.production_countries?.map(p => p.iso_3166_1) ?? [];
    if (pelicula.original_language === "es" && !origenes.includes("ES") && origenes.some(p => PAISES_LATINOS.has(p))) {
        return "original";
    }
    return undefined;
}

export function candidatosLatinos(pelicula: PeliculaConVideos): VideoTrailer[] {
    return (pelicula.videos?.results ?? []).filter(video =>
        video.site === "YouTube" && video.iso_639_1 === "es" &&
        (video.type === "Trailer" || video.type === "Teaser") &&
        /^[A-Za-z0-9_-]{11}$/.test(video.key) &&
        versionLatinaConfirmada(video.name, pelicula, video.iso_3166_1),
    ).sort((a, b) =>
        Number(b.official === true) - Number(a.official === true) ||
        Number(b.type === "Trailer") - Number(a.type === "Trailer") ||
        (b.published_at ?? "").localeCompare(a.published_at ?? ""),
    );
}

export function coincideTituloTrailer(nombre: string, titulos: string[]): boolean {
    const key = claveBasica(nombre);
    return titulos.some(titulo => parseMovieTitleForSearch(titulo).queries.some(query => {
        const clave = claveBasica(query);
        return clave.length >= 4 && key.includes(clave);
    }));
}

export function validarTrailerDelCine(
    url: string,
    youtube: MetadatosYoutube,
    titulo: string,
    pelicula: PeliculaConVideos,
): TrailerLatino | undefined {
    const normalizada = normalizarTrailerUrl(url);
    const nombre = youtube.title ?? "";
    if (!normalizada || !/\b(TRAILER|TEASER|AVANCE)\b/.test(sinAcentosEnMayusculas(nombre))) return undefined;
    if (!coincideTituloTrailer(nombre, [titulo, pelicula.title ?? "", pelicula.original_title ?? ""])) return undefined;
    const version = versionLatinaConfirmada(nombre, pelicula);
    return version ? { url: normalizada, version } : undefined;
}

export async function buscarTrailerLatino(
    titulo: string,
    actual: string | null,
    pelicula: PeliculaConVideos,
    consultarYoutube: (url: string) => Promise<MetadatosYoutube | undefined>,
): Promise<TrailerLatino | undefined> {
    for (const video of candidatosLatinos(pelicula)) {
        const candidata = normalizarTrailerUrl(video.key)!;
        const youtube = await consultarYoutube(candidata);
        if (!youtube?.title) continue;
        const version = versionLatinaConfirmada(`${video.name} ${youtube.title}`, pelicula, video.iso_3166_1);
        if (version) return { url: candidata, version };
    }

    const url = normalizarTrailerUrl(actual);
    if (url?.startsWith("https://www.youtube.com/")) {
        const youtube = await consultarYoutube(url);
        const validado = youtube && validarTrailerDelCine(url, youtube, titulo, pelicula);
        if (validado) return validado;
    }

    return undefined;
}
