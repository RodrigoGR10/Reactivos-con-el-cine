import { normalizarTrailerUrl } from "../../utils/trailer.ts";
import { parseMovieTitleForSearch } from "./consulta.ts";
import { claveBasica, sinAcentosEnMayusculas } from "../../utils/titulos.ts";

export type VersionTrailerEspanol = "doblado" | "original" | "subtitulado" | "espanol";

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

export interface TrailerEspanol {
    url: string;
    version: VersionTrailerEspanol;
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
const SUBTITULADO_ES = /\b(SUBTITULAD[OA]S?|SUBTITULOS(?:\s+EN\s+ESPANOL)?)\b/;
const SUBTITULADO_CON_IDIOMA = /\b(SUBBED|SUBTITLED|SUBTITLES?)\b/;
const SUBTITULADO_EXPLICITO_ES = /\b(?:SUBTITULAD[OA]S?\s+(?:AL|EN)\s+ESPANOL|SUBTITULOS?\s+EN\s+ESPANOL|SPANISH\s+SUBTITLES?|SUBTITLED\s+IN\s+SPANISH|SUBBED\s+IN\s+SPANISH)\b/;
const NO_LATINO = /\b(CASTELLANO|ESPANA|IBERICO)\b/;
const NO_TRAILER = /\b(CONCEPT|CONCEPTO|FANMADE|FAN MADE|REACCION|REACTION|ANALISIS|RESUMEN|ESCENA|ESCENAS|CLIP|CLIPS)\b/;
const LATINO = /\b(LATINO|LATINA|LATINOAMERICANO|LATINOAMERICA|LATAM)\b/;
const DOBLADO = /\b(DOBLAD[OA]|DUBBED|DOBLAJE)\b/;

export function esVersionEspanol(version: unknown): version is VersionTrailerEspanol {
    return version === "doblado" || version === "original" || version === "subtitulado" || version === "espanol";
}

export function versionEspanolConfirmada(
    nombre: string,
    pelicula: PeliculaConVideos,
    pais?: string,
    idiomaVideo?: string,
): VersionTrailerEspanol | undefined {
    const texto = sinAcentosEnMayusculas(nombre);
    if (NO_TRAILER.test(texto)) {
        return undefined;
    }

    const subtituladoEnEspanol =
        SUBTITULADO_EXPLICITO_ES.test(texto) ||
        (idiomaVideo === "es" && SUBTITULADO_ES.test(texto)) ||
        (idiomaVideo === "es" && SUBTITULADO_CON_IDIOMA.test(texto));
    if (subtituladoEnEspanol) return "subtitulado";

    if (NO_LATINO.test(texto) || pais === "ES") return undefined;

    const paisLatino = PAISES_LATINOS.has(pais ?? "");
    const origenes = pelicula.origin_country?.length
        ? pelicula.origin_country : pelicula.production_countries?.map(p => p.iso_3166_1) ?? [];
    if (pelicula.original_language === "es" && !origenes.includes("ES") && origenes.some(p => PAISES_LATINOS.has(p))) {
        return "original";
    }
    if (
        LATINO.test(texto) ||
        (paisLatino && (
            DOBLADO.test(texto) ||
            (pelicula.original_language !== undefined && pelicula.original_language !== "es")
        ))
    ) return "doblado";
    return undefined;
}

export function candidatosEspanol(pelicula: PeliculaConVideos): VideoTrailer[] {
    return (pelicula.videos?.results ?? []).filter(video =>
        video.site === "YouTube" &&
        (video.iso_639_1 === "es" || SUBTITULADO_EXPLICITO_ES.test(sinAcentosEnMayusculas(video.name))) &&
        (video.type === "Trailer" || video.type === "Teaser") &&
        /^[A-Za-z0-9_-]{11}$/.test(video.key) &&
        versionEspanolConfirmada(video.name, pelicula, video.iso_3166_1, video.iso_639_1),
    ).sort((a, b) =>
        prioridadVersion(versionEspanolConfirmada(b.name, pelicula, b.iso_3166_1, b.iso_639_1)) -
        prioridadVersion(versionEspanolConfirmada(a.name, pelicula, a.iso_3166_1, a.iso_639_1)) ||
        Number(b.official === true) - Number(a.official === true) ||
        Number(b.type === "Trailer") - Number(a.type === "Trailer") ||
        (b.published_at ?? "").localeCompare(a.published_at ?? ""),
    );
}

function prioridadVersion(version: VersionTrailerEspanol | undefined): number {
    switch (version) {
        case "doblado":
        case "original":
            return 3;
        case "subtitulado":
            return 2;
        case "espanol":
            return 1;
        default:
            return 0;
    }
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
): TrailerEspanol | undefined {
    const normalizada = normalizarTrailerUrl(url);
    const nombre = youtube.title ?? "";
    if (!normalizada || !/\b(TRAILER|TEASER|AVANCE)\b/.test(sinAcentosEnMayusculas(nombre))) return undefined;
    if (!coincideTituloTrailer(nombre, [titulo, pelicula.title ?? "", pelicula.original_title ?? ""])) return undefined;
    if (NO_TRAILER.test(sinAcentosEnMayusculas(nombre))) return undefined;
    const version = versionEspanolConfirmada(nombre, pelicula);
    // Si el cine entrega un avance propio para su cartelera chilena y no hay
    // una pista clara sobre el audio, se conserva como versión en español.
    return { url: normalizada, version: version ?? "espanol" };
}

export async function buscarTrailerEspanol(
    titulo: string,
    actual: string | null,
    pelicula: PeliculaConVideos,
    consultarYoutube: (url: string) => Promise<MetadatosYoutube | undefined>,
): Promise<TrailerEspanol | undefined> {
    for (const video of candidatosEspanol(pelicula)) {
        const candidata = normalizarTrailerUrl(video.key)!;
        const youtube = await consultarYoutube(candidata);
        if (!youtube?.title) continue;
        const version = versionEspanolConfirmada(
            `${video.name} ${youtube.title}`,
            pelicula,
            video.iso_3166_1,
            video.iso_639_1,
        );
        if (version) return { url: candidata, version };
    }

    const url = normalizarTrailerUrl(actual);
    if (url?.startsWith("https://pimcore-content.cinepolis.com/") && /\/Es\//i.test(url)) {
        return { url, version: "espanol" };
    }
    if (url?.startsWith("https://www.youtube.com/")) {
        const youtube = await consultarYoutube(url);
        const validado = youtube && validarTrailerDelCine(url, youtube, titulo, pelicula);
        if (validado) return validado;
    }

    return undefined;
}
