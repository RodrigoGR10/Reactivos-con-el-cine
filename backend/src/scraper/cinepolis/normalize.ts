import { fechaDeEstreno, scheduleRevision } from "../normalize.ts";
import { normalizarSinopsis } from "../../utils/sinopsis.ts";
import { normalizarComuna } from "../../utils/comunas.ts";
import { normalizarTrailerUrl } from "../../utils/trailer.ts";
import { purchaseUrl, SITE } from "./client.ts";
import type { ScrapedCinema, ScrapedMovie, ScrapedSchedule } from "../types.ts";
import type {
    CinepolisCinema,
    CinepolisMovie,
    CinepolisShowtime,
    FormatoFuente,
    FormatoInput,
    FormatoSala,
    Proyeccion,
    RawGqlLanguage,
    RawGqlMovie,
    RawGqlShowtime,
} from "./types.ts";

/** Campos adicionales opcionales; los campos originales se mantienen intactos. */
export type CinepolisCinemaFull = ScrapedCinema & {
    vistaId: string;
};

export type CinepolisMovieFull = ScrapedMovie & {
    tituloOriginal?: string;
    clasificacionDescripcion?: string;
    datosIncompletos: boolean;
};

export type CinepolisScheduleFull = ScrapedSchedule & {
    proyeccion: Proyeccion;
    experiencia: string | null;
    formatoFuente: FormatoFuente;
    formatoOriginal: string | null;
    experienciaOriginal: string | null;
    idiomaOriginal: string | null;
    numeroSala: string | null;
    disponibilidad: string | null;
    fechaHora: string | null;
    vistaCinemaId: string | null;
    vistaMovieId: string | null;
};

function text(value: string, field: string): string {
    if (typeof value !== "string" || !value.trim())
        throw new Error(`Falta ${field} en Cinépolis.`);
    return value.trim();
}

export function normalizeCinema(
    cinema: CinepolisCinema,
    extractedAt: string,
): CinepolisCinemaFull {
    const id = text(cinema.id, "id de cine");
    const coordenadas = {
        ...(Number.isFinite(cinema.latitude)
            ? { latitud: cinema.latitude }
            : {}),
        ...(Number.isFinite(cinema.longitude)
            ? { longitud: cinema.longitude }
            : {}),
    };
    return {
        id: `cinepolis:${id}`,
        origen: "cinepolis",
        origenId: id,
        extraidoEn: extractedAt,
        nombre: text(cinema.name, "nombre de cine"),
        comuna: normalizarComuna(text(cinema.comuna, "comuna")),
        ciudad: text(cinema.city, "ciudad"),
        direccion: text(cinema.address, "direccion"),
        url: `${SITE}/horarios?cinema=${encodeURIComponent(text(cinema.slug, "slug de cine"))}`,
        logo: "/cinepolis.png",
        vistaId: text(cinema.vistaId, "vistaId"),
        ...coordenadas,
    };
}

export function normalizeMovie(
    movie: CinepolisMovie,
    extractedAt: string,
): CinepolisMovieFull {
    const id = text(movie.id, "id de pelicula");
    if (
        movie.runTime !== null &&
        (!Number.isInteger(movie.runTime) || movie.runTime < 30)
    ) {
        throw new Error(`Duración de Cinépolis inválida para ${movie.id}.`);
    }
    return {
        id: `cinepolis:${id}`,
        origen: "cinepolis",
        origenId: id,
        extraidoEn: extractedAt,
        titulo: text(movie.title, "titulo"),
        tituloOriginal: movie.originalTitle?.trim() || undefined,
        duracion: movie.runTime,
        estadoEstreno: "cartelera",
        fechaEstreno: fechaDeEstreno(movie.releaseDate),
        genero: text(movie.genre || "General", "genero"),
        clasificacion: text(movie.rating || "TE", "clasificacion"),
        clasificacionDescripcion: movie.ratingDescription,
        sinopsis: normalizarSinopsis(movie.synopsis),
        poster: text(movie.poster, "poster"),
        trailerUrl: normalizarTrailerUrl(movie.trailerUrl),
        url: `${SITE}/detalle?movie=${encodeURIComponent(text(movie.slug, "slug de pelicula"))}`,
        datosIncompletos: movie.datosIncompletos ?? false,
    };
}

export function normalizeSchedule(
    showtime: CinepolisShowtime,
    movie: CinepolisMovie,
    cinema: CinepolisCinema,
    extractedAt: string,
): CinepolisScheduleFull {
    const sourceId = `${cinema.id}:${showtime.sessionId}`;
    const schedule = {
        id: `cinepolis:${sourceId}`,
        origen: "cinepolis" as const,
        origenId: sourceId,
        extraidoEn: extractedAt,
        peliculaId: `cinepolis:${movie.id}`,
        cineId: `cinepolis:${cinema.id}`,
        sesionId: showtime.sessionId,
        fecha: showtime.date,
        fechaCartelera: showtime.date,
        horario: showtime.time,
        formatoResumen: showtime.format,
        idioma: showtime.language,
        sala: showtime.screen,
        agotada: showtime.agotada,
        urlCompra: showtime.purchaseUrl,
        proyeccion: showtime.projection,
        experiencia: showtime.experience,
        formatoFuente: showtime.formatSource,
        formatoOriginal: showtime.rawFormat,
        experienciaOriginal: showtime.rawExperience,
        idiomaOriginal: showtime.rawLanguage,
        numeroSala: showtime.screenNumber,
        disponibilidad: showtime.availability,
        fechaHora: showtime.datetime,
        vistaCinemaId: showtime.vistaCinemaId,
        vistaMovieId: showtime.vistaMovieId,
    };
    return { ...schedule, revision: scheduleRevision(schedule) };
}

const ZONA = "America/Santiago";
const AGOTADA_RE = /AGOT|SOLD|FULL|UNAVAIL|NO\s*DISP|^0$/i;
const SALAS_4DX = [
    "la-reina",
    "parque-arauco",
    "los-dominicos",
    "arauco-maipu",
    "vivo-coquimbo",
];
const GENERICAS = new Set([
    "",
    "TRADICIONAL",
    "REGULAR",
    "ESTÁNDAR",
    "ESTANDAR",
    "GENERAL",
    "DIGITAL",
]);
const HORA_SANTIAGO = new Intl.DateTimeFormat("en-GB", {
    timeZone: ZONA,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
});

/** Devuelve el texto recortado o null cuando no hay valor útil. */
export function txt(v: unknown): string | null {
    if (v === undefined || v === null) return null;
    const s = String(v).trim();
    return s === "" ? null : s;
}

/** Convierte duraciones comunes a minutos; rechaza valores menores de 30. */
export function parseDuracion(raw: unknown): number | null {
    if (typeof raw === "number")
        return Number.isInteger(raw) && raw >= 30 ? raw : null;
    if (typeof raw !== "string") return null;
    const s = raw.trim().toLowerCase();

    let m = s.match(/^(\d{1,2}):(\d{2})$/);
    if (m) {
        const minutos = Number(m[1]) * 60 + Number(m[2]);
        return minutos >= 30 ? minutos : null;
    }

    m = s.match(/^pt(?:(\d+)h)?(?:(\d+)m)?$/);
    if (m && (m[1] || m[2])) {
        const minutos = Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0);
        return minutos >= 30 ? minutos : null;
    }

    m = s.match(/^(\d+)\s*h\w*(?:\s*(\d+)\s*m\w*)?$/);
    if (m) {
        const minutos = Number(m[1]) * 60 + Number(m[2] ?? 0);
        return minutos >= 30 ? minutos : null;
    }

    m = s.match(/^(\d+)\s*(?:m|min|mins|minutos?)?$/);
    if (m) {
        const minutos = Number(m[1]);
        return minutos >= 30 ? minutos : null;
    }

    return null;
}

export function normalizarClasificacion(raw?: string | null): string {
    if (!raw) return "TE";
    const con = raw.startsWith("+") ? raw : `+${raw}`;
    if (con === "+TE") return "TE";
    if (con === "+TE7") return "TE+7";
    return con;
}

export function idiomaDesde(lang: RawGqlLanguage): {
    normalizado: string;
    raw: string | null;
} {
    const raw = txt(lang.displayLanguage) ?? txt(lang.language);
    const t =
        `${lang.language ?? ""} ${lang.displayLanguage ?? ""}`.toUpperCase();
    if (t.includes("SUB")) return { normalizado: "Subtitulada", raw };
    if (/DOB|ESP|LATINO/.test(t)) return { normalizado: "Doblada", raw };
    return { normalizado: raw ?? "Doblada", raw };
}

/** Hora local de Santiago (HH:MM). Si la fecha-hora trae zona, la convierte; si no, la toma tal cual. */
export function horaLocal(datetime: string | null): string | null {
    if (!datetime) return null;
    const m = datetime.match(
        /^\d{4}-\d{2}-\d{2}[T ](\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/,
    );
    if (!m) return null;
    if (!m[3]) return `${m[1]}:${m[2]}`;
    const d = new Date(datetime.replace(" ", "T"));
    return Number.isNaN(d.getTime()) ? null : HORA_SANTIAGO.format(d);
}

function desdeExperiencia(
    texto: string,
    p: Proyeccion,
    infinity: boolean,
): { experiencia: string; resumen: string } {
    if (texto.includes("4DX") || texto.includes("4D")) {
        return infinity
            ? {
                  experiencia: "4D INFINITY VISION",
                  resumen: `4D ${p} INFINITY VISION`,
              }
            : { experiencia: "4DX", resumen: `4DX ${p}` };
    }
    if (texto.includes("IMAX"))
        return { experiencia: "IMAX", resumen: `${p} IMAX` };
    if (texto.includes("VIP") || texto.includes("PREMIUM"))
        return { experiencia: "VIP", resumen: `VIP ${p}` };
    if (texto.includes("JUNIOR"))
        return { experiencia: "JUNIOR", resumen: `JUNIOR ${p}` };
    if (texto.includes("PLUUS") || texto.includes("PLUUX"))
        return { experiencia: "PLUUS", resumen: `PLUUS ${p}` };
    if (texto.includes("MACRO"))
        return { experiencia: "MACRO XE", resumen: `MACRO XE ${p}` };
    return { experiencia: texto, resumen: `${p} ${texto}` };
}

/**
 * Determina proyección y experiencia. Prioridad: dato de la API; luego heurísticas,
 * que quedan marcadas con fuente "heuristica" para que se puedan filtrar o revisar.
 */
export function resolveCinepolisFormat(input: FormatoInput): FormatoSala {
    const proyeccion: Proyeccion = (input.formatName ?? "")
        .toUpperCase()
        .includes("3D")
        ? "3D"
        : "2D";
    const limpiar = (t?: string | null) =>
        (t ?? "")
            .toUpperCase()
            .replace(/\b[23]D\b/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    const exp = limpiar(input.experienceName);
    const fmt = limpiar(input.formatName);
    const infinity = /infinity[\s-]?vision/i.test(input.movieSlugOrTitle ?? "");

    const texto = [exp, fmt].find((t) => t && !GENERICAS.has(t));
    if (texto) {
        const d = desdeExperiencia(texto, proyeccion, infinity);
        return {
            proyeccion,
            experiencia: d.experiencia,
            resumen: d.resumen,
            fuente: "api",
        };
    }

    const cine = (input.cinemaId ?? "").toLowerCase();
    const sala = String(input.screen ?? "")
        .toUpperCase()
        .replace(/^SALA\s*/, "")
        .trim();
    const pelicula = (input.movieSlugOrTitle ?? "").toLowerCase();
    const porHeuristica = (t: string): FormatoSala => {
        const d = desdeExperiencia(t, proyeccion, infinity);
        return {
            proyeccion,
            experiencia: d.experiencia,
            resumen: d.resumen,
            fuente: "heuristica",
        };
    };

    if (cine.includes("premium") || cine.includes("casa-costanera"))
        return porHeuristica("VIP");
    if (SALAS_4DX.some((c) => cine.includes(c)) && sala === "1")
        return porHeuristica("4DX");
    if (cine.includes("plaza-egana") && sala === "11")
        return porHeuristica("IMAX");
    if (pelicula.includes("4dx")) return porHeuristica("4DX");
    if (pelicula.includes("imax")) return porHeuristica("IMAX");
    if (infinity) return porHeuristica("INFINITY VISION");

    return {
        proyeccion,
        experiencia: null,
        resumen: proyeccion,
        fuente: "por_defecto",
    };
}

export function buildPosterUrl(
    rawPath?: string,
    resourceName?: string,
): string {
    if (!rawPath) return "https://cinepolis.com/placeholder.jpg";
    if (/^https?:\/\//.test(rawPath)) return rawPath;
    let clean = rawPath
        .replace(/^\/pimcore\/\d+\//, "")
        .replace(/^\/+|\/+$/g, "");
    if (!/\.(jpe?g|png|webp)$/i.test(clean)) {
        const extMatch = (resourceName || "").match(/\.(jpe?g|png|webp)$/i);
        clean += extMatch ? extMatch[0].toLowerCase() : ".jpg";
    }
    return `https://pimcore-content.cinepolis.com/${clean}`;
}

export function movieDesdeApi(raw: RawGqlMovie): CinepolisMovie {
    const posterItem =
        raw.media?.find((m) => m.code === "poster") ||
        raw.media?.find((m) => m.code === "movie_card") ||
        raw.media?.find((m) => m.type === "image");
    const duracion = parseDuracion(raw.length);
    const genero = Array.isArray(raw.genre)
        ? raw.genre.filter(Boolean).join(", ")
        : (raw.genre ?? "");
    const posterPath = posterItem?.sizes?.large || posterItem?.resource;
    return {
        id: raw.id,
        title: raw.name,
        originalTitle: raw.originalName || undefined,
        slug: raw.id,
        runTime: duracion,
        genre: genero || "General",
        rating: normalizarClasificacion(raw.rating),
        ratingDescription: raw.ratingDescription || undefined,
        synopsis: raw.synopsis || "Sin sinopsis disponible.",
        poster: buildPosterUrl(posterPath, posterItem?.resource),
        trailerUrl: raw.media
            ?.filter(
                (media) =>
                    media.type === "video" || /trailer/i.test(media.code ?? ""),
            )
            .map(
                (media) =>
                    normalizarTrailerUrl(media.sizes?.large) ??
                    normalizarTrailerUrl(media.resource),
            )
            .find((url) => url !== undefined),
        releaseDate: raw.releaseDate ? raw.releaseDate.slice(0, 10) : undefined,
        datosIncompletos: duracion === null || !posterItem,
    };
}

/** Película de respaldo cuando aparece en horarios pero no en la cartelera. */
export function peliculaMinima(movieId: string): CinepolisMovie {
    return {
        id: movieId,
        title: movieId.replace(/-/g, " ").toUpperCase(),
        slug: movieId,
        runTime: null,
        genre: "General",
        rating: "TE",
        synopsis: "Sin sinopsis disponible.",
        poster: "https://cinepolis.com/placeholder.jpg",
        datosIncompletos: true,
    };
}

export interface ContextoSesion {
    cinema: CinepolisCinema;
    movie: CinepolisMovie;
    fecha: string;
    hora: string;
    idioma: { normalizado: string; raw: string | null };
}

/** Traduce una función cruda de GraphQL al modelo de dominio de Cinépolis. */
export function showtimeDesdeApi(
    st: RawGqlShowtime,
    ctx: ContextoSesion,
): CinepolisShowtime {
    const { cinema, movie, fecha, hora, idioma } = ctx;
    const numeroSala = txt(st.screen)?.replace(/^SALA\s*/i, "") ?? null;
    const formato = resolveCinepolisFormat({
        formatName: txt(st.format?.name),
        experienceName: txt(st.experience?.name),
        screen: numeroSala,
        cinemaId: cinema.id,
        movieSlugOrTitle: `${movie.slug} ${movie.title}`,
    });
    const disponibilidad = txt(st.availability);

    return {
        sessionId: txt(st.sessionId) ?? "",
        cinemaId: cinema.id,
        movieId: movie.id,
        date: fecha,
        datetime: txt(st.datetime),
        time: hora,
        projection: formato.proyeccion,
        experience: formato.experiencia,
        formatSource: formato.fuente,
        format: formato.resumen,
        language: idioma.normalizado,
        rawLanguage: idioma.raw,
        rawFormat: txt(st.format?.name),
        rawExperience: txt(st.experience?.name),
        screen: numeroSala ? `SALA ${numeroSala}` : "",
        screenNumber: numeroSala,
        availability: disponibilidad,
        agotada: disponibilidad !== null && AGOTADA_RE.test(disponibilidad),
        vistaCinemaId: txt(st.cinemaVistaId) ?? cinema.vistaId,
        vistaMovieId: txt(st.movieVistaId),
        purchaseUrl: purchaseUrl(
            movie.slug,
            cinema.slug,
            txt(st.sessionId) ?? "",
        ),
    };
}
