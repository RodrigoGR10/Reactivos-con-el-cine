import { normalizarTrailerUrl } from "../../utils/trailer.ts";
import { parseMovieTitleForSearch } from "./consulta.ts";
import { claveBasica, sinAcentosEnMayusculas } from "../../utils/titulos.ts";

/**
 * Categoría usada para indicar si un tráiler es doblado, original o subtitulado.
 */
export type VersionTrailerEspanol =
    "doblado" | "original" | "subtitulado" | "espanol" | "otro";

/**
 * Datos de un video asociado a una película en TMDB.
 */
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

/**
 * Campos de la película de TMDB necesarios para evaluar sus videos.
 */
export interface PeliculaConVideos {
    title?: string;
    original_title?: string;
    original_language?: string;
    origin_country?: string[];
    production_countries?: { iso_3166_1: string }[];
    videos?: { results?: VideoTrailer[] };
}

/**
 * URL del tráiler elegido y clasificación del idioma de su versión.
 */
export interface TrailerEspanol {
    url: string;
    version: VersionTrailerEspanol;
    idioma: string;
}

/**
 * Información pública de YouTube usada para verificar un enlace de tráiler.
 */
export interface MetadatosYoutube {
    title?: string;
    author_name?: string;
    author_url?: string;
}

const PAISES_LATINOS = new Set([
    "MX",
    "AR",
    "CL",
    "CO",
    "PE",
    "VE",
    "EC",
    "BO",
    "PY",
    "UY",
    "CR",
    "PA",
    "SV",
    "GT",
    "HN",
    "NI",
    "DO",
    "CU",
    "PR",
]);
const SUBTITULADO_ES =
    /\b(SUBTITULAD[OA]S?|SUBTITULOS(?:\s+EN\s+ESPANOL)?)\b|(?:\(\s*SUB\s*\)|\|\s*SUB\b|\bSUB\s*$)/;
const SUBTITULADO_CON_IDIOMA = /\b(SUBBED|SUBTITLED|SUBTITLES?)\b/;
const SUBTITULADO_EXPLICITO_ES =
    /\b(?:SUBTITULAD[OA]S?\s+(?:AL|EN)\s+ESPANOL|SUBTITULOS?\s+EN\s+ESPANOL|SPANISH\s+SUBTITLES?|SUBTITLED\s+IN\s+SPANISH|SUBBED\s+IN\s+SPANISH)\b/;
const NO_LATINO = /\b(CASTELLANO|ESPANA|IBERICO)\b/;
const NO_TRAILER =
    /\b(CONCEPT|CONCEPTO|FANMADE|FAN MADE|REACCION|REACTION|ANALISIS|RESUMEN|ESCENA|ESCENAS|CLIP|CLIPS)\b/;
const LATINO = /\b(LATINO|LATINA|LATINOAMERICANO|LATINOAMERICA|LATAM)\b/;
const DOBLADO = /\b(DOBLAD[OA]|DUBBED|DOBLAJE)\b/;

/**
 * Evalúa si los datos del video indican una versión en español.
 * @param version Versión de idioma y doblaje que se evalúa.
 * @returns Valor booleano que indica si se cumple la condición.
 */
export function esVersionEspanol(
    version: unknown,
): version is VersionTrailerEspanol {
    return (
        version === "doblado" ||
        version === "original" ||
        version === "subtitulado" ||
        version === "espanol" ||
        version === "otro"
    );
}

function ordenarVideosBase(a: VideoTrailer, b: VideoTrailer): number {
    return (
        Number(b.official === true) - Number(a.official === true) ||
        Number(b.type === "Trailer") - Number(a.type === "Trailer") ||
        (b.published_at ?? "").localeCompare(a.published_at ?? "")
    );
}

function esVideoYoutubeValido(video: VideoTrailer): boolean {
    return (
        video.site === "YouTube" &&
        (video.type === "Trailer" || video.type === "Teaser") &&
        /^[A-Za-z0-9_-]{11}$/.test(video.key) &&
        !NO_TRAILER.test(sinAcentosEnMayusculas(video.name))
    );
}

/**
 * Comprueba si el idioma del tráiler está confirmado como español.
 * @param nombre Nombre o título que se analiza.
 * @param pelicula Datos de la película que se procesa.
 * @param pais Código del país de origen del video.
 * @param idiomaVideo Código del idioma informado para el video.
 */
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
        ? pelicula.origin_country
        : (pelicula.production_countries?.map((p) => p.iso_3166_1) ?? []);
    if (
        pelicula.original_language === "es" &&
        !origenes.includes("ES") &&
        origenes.some((p) => PAISES_LATINOS.has(p))
    ) {
        return "original";
    }
    if (
        LATINO.test(texto) ||
        (paisLatino &&
            (DOBLADO.test(texto) ||
                (pelicula.original_language !== undefined &&
                    pelicula.original_language !== "es")))
    )
        return "doblado";
    return undefined;
}

/**
 * Filtra los videos de la película que pueden servir como tráiler en español.
 * @param pelicula Datos de la película que se procesa.
 * @returns Lista de resultados encontrados o transformados.
 */
export function candidatosEspanol(pelicula: PeliculaConVideos): VideoTrailer[] {
    return (pelicula.videos?.results ?? [])
        .filter(
            (video) =>
                esVideoYoutubeValido(video) &&
                (video.iso_639_1 === "es" ||
                    SUBTITULADO_EXPLICITO_ES.test(
                        sinAcentosEnMayusculas(video.name),
                    )) &&
                versionEspanolConfirmada(
                    video.name,
                    pelicula,
                    video.iso_3166_1,
                    video.iso_639_1,
                ),
        )
        .sort(
            (a, b) =>
                prioridadVersion(
                    versionEspanolConfirmada(
                        b.name,
                        pelicula,
                        b.iso_3166_1,
                        b.iso_639_1,
                    ),
                ) -
                    prioridadVersion(
                        versionEspanolConfirmada(
                            a.name,
                            pelicula,
                            a.iso_3166_1,
                            a.iso_639_1,
                        ),
                    ) || ordenarVideosBase(a, b),
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

/**
 * Comprueba que el tráiler corresponda al título de la película.
 * @param nombre Nombre o título que se analiza.
 * @param titulos Título que se analiza o compara.
 * @returns Resultado que indica si se cumple la condición evaluada.
 */
export function coincideTituloTrailer(
    nombre: string,
    titulos: string[],
): boolean {
    const key = claveBasica(nombre);
    return titulos.some((titulo) =>
        parseMovieTitleForSearch(titulo).queries.some((query) => {
            const clave = claveBasica(query);
            return clave.length >= 4 && key.includes(clave);
        }),
    );
}

/**
 * Valida el tráiler aportado por un cine antes de asociarlo a la película.
 * @param url Dirección del recurso que se consulta.
 * @param youtube Metadatos públicos del video obtenidos desde YouTube.
 * @param titulo Título que se normaliza, compara o busca.
 * @param pelicula Datos de la película que se procesa.
 * @returns Valor booleano que indica si se cumple la condición evaluada.
 */
export function validarTrailerDelCine(
    url: string,
    youtube: MetadatosYoutube,
    titulo: string,
    pelicula: PeliculaConVideos,
): TrailerEspanol | undefined {
    const normalizada = normalizarTrailerUrl(url);
    const nombre = youtube.title ?? "";
    const texto = sinAcentosEnMayusculas(nombre);
    if (!normalizada || !/\b(TRAILER|TEASER|AVANCE)\b/.test(texto))
        return undefined;
    if (
        !coincideTituloTrailer(nombre, [
            titulo,
            pelicula.title ?? "",
            pelicula.original_title ?? "",
        ])
    )
        return undefined;
    if (NO_TRAILER.test(texto)) return undefined;

    if (
        pelicula.original_language === "es" &&
        !DOBLADO.test(texto) &&
        !SUBTITULADO_ES.test(texto)
    ) {
        return { url: normalizada, version: "original", idioma: "es-419" };
    }
    if (SUBTITULADO_ES.test(texto) || SUBTITULADO_CON_IDIOMA.test(texto)) {
        return { url: normalizada, version: "subtitulado", idioma: "es-419" };
    }
    if (DOBLADO.test(texto) || LATINO.test(texto)) {
        return { url: normalizada, version: "doblado", idioma: "es-419" };
    }
    // Si el cine entrega un avance propio para su cartelera chilena y no hay
    // una pista clara sobre el audio, se conserva como versión en español sin etiqueta.
    return { url: normalizada, version: "espanol", idioma: "es-419" };
}

function candidatosOriginalEnEspanolSinEtiquetar(
    pelicula: PeliculaConVideos,
): VideoTrailer[] {
    if (pelicula.original_language !== "es") return [];
    return (pelicula.videos?.results ?? [])
        .filter((video) => {
            if (!esVideoYoutubeValido(video)) return false;
            const texto = sinAcentosEnMayusculas(video.name);
            return !DOBLADO.test(texto) && !SUBTITULADO_CON_IDIOMA.test(texto);
        })
        .sort(ordenarVideosBase);
}

function candidatosEspana(pelicula: PeliculaConVideos): VideoTrailer[] {
    return (pelicula.videos?.results ?? [])
        .filter((video) => {
            if (!esVideoYoutubeValido(video)) return false;
            if (video.official !== true) return false;
            const texto = sinAcentosEnMayusculas(video.name);
            return (
                video.iso_639_1 === "es" &&
                (video.iso_3166_1 === "ES" || NO_LATINO.test(texto))
            );
        })
        .sort(ordenarVideosBase);
}

function candidatosFallbackTmdb(pelicula: PeliculaConVideos): VideoTrailer[] {
    return (pelicula.videos?.results ?? [])
        .filter(esVideoYoutubeValido)
        .sort((a, b) => {
            const officialDiff =
                Number(b.official === true) - Number(a.official === true);
            if (officialDiff !== 0) return officialDiff;

            const orig = pelicula.original_language;
            const aOrig = Number(Boolean(orig && a.iso_639_1 === orig));
            const bOrig = Number(Boolean(orig && b.iso_639_1 === orig));
            if (bOrig !== aOrig) return bOrig - aOrig;

            const aIngles = Number(a.iso_639_1 === "en");
            const bIngles = Number(b.iso_639_1 === "en");
            if (bIngles !== aIngles) return bIngles - aIngles;

            const aSinDoblar = Number(
                !DOBLADO.test(sinAcentosEnMayusculas(a.name)),
            );
            const bSinDoblar = Number(
                !DOBLADO.test(sinAcentosEnMayusculas(b.name)),
            );
            if (bSinDoblar !== aSinDoblar) return bSinDoblar - aSinDoblar;

            return ordenarVideosBase(a, b);
        });
}

async function elegirYoutubeValido(
    videos: VideoTrailer[],
    consultarYoutube: (url: string) => Promise<MetadatosYoutube | undefined>,
    resolver: (
        video: VideoTrailer,
        youtube: MetadatosYoutube,
    ) => TrailerEspanol | undefined,
): Promise<TrailerEspanol | undefined> {
    for (const video of videos) {
        const candidata = normalizarTrailerUrl(video.key);
        if (!candidata) continue;
        const youtube = await consultarYoutube(candidata);
        if (!youtube?.title) continue;
        if (NO_TRAILER.test(sinAcentosEnMayusculas(youtube.title))) continue;
        const elegido = resolver(video, youtube);
        if (elegido) return elegido;
    }
    return undefined;
}

/**
 * Busca y prioriza un tráiler en español latino o subtitulado al español.
 * @param titulo Título que se normaliza, compara o busca.
 * @param actual URL de tráiler que tiene actualmente la película.
 * @param pelicula Datos de la película que se procesa.
 * @param consultarYoutube Indica si se permite verificar candidatos con YouTube.
 * @returns Datos encontrados, o `null` cuando el registro no existe.
 */
export async function buscarTrailerEspanol(
    titulo: string,
    actual: string | null,
    pelicula: PeliculaConVideos,
    consultarYoutube: (url: string) => Promise<MetadatosYoutube | undefined>,
): Promise<TrailerEspanol | undefined> {
    // 1. Latam / subtitulado al español confirmado en TMDB (es-419).
    const latam = await elegirYoutubeValido(
        candidatosEspanol(pelicula),
        consultarYoutube,
        (video, youtube) => {
            const version = versionEspanolConfirmada(
                `${video.name} ${youtube.title}`,
                pelicula,
                video.iso_3166_1,
                video.iso_639_1,
            );
            return version
                ? {
                      url: normalizarTrailerUrl(video.key)!,
                      version,
                      idioma: "es-419",
                  }
                : undefined;
        },
    );
    if (latam) return latam;

    // 1b. Películas originalmente en español con tráiler mal etiquetado en TMDB.
    const originalEspanol = await elegirYoutubeValido(
        candidatosOriginalEnEspanolSinEtiquetar(pelicula),
        consultarYoutube,
        (video) => ({
            url: normalizarTrailerUrl(video.key)!,
            version: "original",
            idioma: "es-419",
        }),
    );
    if (originalEspanol) return originalEspanol;

    // 2. Tráiler propio entregado por las cadenas de cine chilenas.
    const url = normalizarTrailerUrl(actual);
    if (
        url?.startsWith("https://pimcore-content.cinepolis.com/") &&
        /\/Es\//i.test(url)
    ) {
        return { url, version: "espanol", idioma: "es-419" };
    }
    if (url?.startsWith("https://www.youtube.com/")) {
        const youtube = await consultarYoutube(url);
        const validado =
            youtube && validarTrailerDelCine(url, youtube, titulo, pelicula);
        if (validado) return validado;
    }

    // 3. Fallback a doblaje / español de España (es-ES) en TMDB.
    const espana = await elegirYoutubeValido(
        candidatosEspana(pelicula),
        consultarYoutube,
        (video, youtube) => {
            const texto = sinAcentosEnMayusculas(
                `${video.name} ${youtube.title}`,
            );
            const version: VersionTrailerEspanol =
                SUBTITULADO_ES.test(texto) || SUBTITULADO_CON_IDIOMA.test(texto)
                    ? "subtitulado"
                    : pelicula.original_language === "es"
                      ? "original"
                      : "doblado";
            return {
                url: normalizarTrailerUrl(video.key)!,
                version,
                idioma: "es-ES",
            };
        },
    );
    if (espana) return espana;

    // 4. Último recurso: Audio Original o cualquier tráiler oficial válido de TMDB.
    return await elegirYoutubeValido(
        candidatosFallbackTmdb(pelicula),
        consultarYoutube,
        (video, youtube) => {
            const texto = sinAcentosEnMayusculas(
                `${video.name} ${youtube.title}`,
            );
            const idioma = (
                video.iso_639_1 ||
                pelicula.original_language ||
                "und"
            ).slice(0, 20);
            const esIdiomaOriginal = Boolean(
                pelicula.original_language &&
                video.iso_639_1 === pelicula.original_language &&
                !DOBLADO.test(texto) &&
                !SUBTITULADO_CON_IDIOMA.test(texto),
            );
            const version: VersionTrailerEspanol = esIdiomaOriginal
                ? "original"
                : SUBTITULADO_EXPLICITO_ES.test(texto)
                  ? "subtitulado"
                  : "otro";
            return { url: normalizarTrailerUrl(video.key)!, version, idioma };
        },
    );
}
