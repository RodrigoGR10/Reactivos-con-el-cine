import fs from "node:fs";
import path from "node:path";
import { API_KEY, CINES_CINEPOLIS } from "./client.ts";
import {
    horaLocal,
    idiomaDesde,
    movieDesdeApi,
    normalizeCinema,
    normalizeMovie,
    normalizeSchedule,
    peliculaMinima,
    showtimeDesdeApi,
    txt,
} from "./normalize.ts";
import { PAGE_SCRIPT } from "./pageScript.ts";
import { startChromeSession } from "./browser.ts";
import { localNow } from "../../utils/localNow.ts";
import type { CinepolisCinema, PageResult } from "./types.ts";
import type {
    ScrapedCinema,
    ScrapedMovie,
    ScrapedSchedule,
    ScrapeOptions,
    ScrapeResult,
} from "../types.ts";

type Incidencia = NonNullable<ScrapeResult["incidencias"]>[number];
type Severidad = "error" | "aviso" | "info";

const API_URL = "https://api-g.cinepolis.com/v2/billboards/graphql";
const COUNTRY_ID = "CL";
const ZONA = "America/Santiago";
const DEBUG = process.env.CINEPOLIS_DEBUG === "1";
const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

const mensajeError = (err: unknown) =>
    err instanceof Error ? err.message : String(err);

function incidencia(
    tipo: string,
    severidad: Severidad,
    mensaje: string,
    extra: Record<string, unknown> = {},
): Incidencia {
    const etapa: Incidencia["etapa"] = tipo.includes("cine")
        ? "cine"
        : tipo.includes("pelicula")
          ? "pelicula"
          : "funcion";
    return {
        etapa,
        origen: "cinepolis",
        tipo,
        severidad,
        mensaje,
        ...extra,
    } as unknown as Incidencia;
}

function sumarDias(fecha: string, dias: number): string {
    const [y, m, d] = fecha.split("-").map(Number);
    if (y === undefined || m === undefined || d === undefined) {
        throw new Error(`Fecha inválida: ${fecha}`);
    }
    return new Date(Date.UTC(y, m - 1, d + dias)).toISOString().slice(0, 10);
}

/** Un selector coincide por id, slug, vistaId o por coincidencia parcial de id/slug. */
function coincideCine(cine: CinepolisCinema, selector: string): boolean {
    return (
        cine.id === selector ||
        cine.slug === selector ||
        cine.vistaId === selector ||
        cine.id.includes(selector) ||
        cine.slug.includes(selector)
    );
}

/** Valida los selectores recibidos y devuelve los cines a consultar. */
function resolverCines(
    cines: CinepolisCinema[],
    selectores: string[],
): CinepolisCinema[] {
    for (const selector of selectores) {
        if (!cines.some((c) => coincideCine(c, selector))) {
            throw new Error(
                `Cine desconocido: ${selector}. Usa --list-cinemas.`,
            );
        }
    }
    if (!selectores.length) return cines;
    return cines.filter((c) => selectores.some((s) => coincideCine(c, s)));
}

function guardarDebug(raw: PageResult): void {
    const dir = path.join(process.cwd(), "debug");
    fs.mkdirSync(dir, { recursive: true });
    const archivo = path.join(dir, `cinepolis-raw-${Date.now()}.json`);
    fs.writeFileSync(archivo, JSON.stringify(raw, null, 2));
    console.error(`[cinepolis] Respuesta cruda guardada en ${archivo}`);
}

/** Ejecuta el script de extracción dentro de una sesión de Chrome y cierra la sesión siempre. */
async function obtenerDatos(
    config: unknown,
    perfilTemporal: boolean,
): Promise<PageResult> {
    const session = await startChromeSession({ perfilTemporal });
    try {
        return await session.evaluate<PageResult>(
            `(${PAGE_SCRIPT})(${JSON.stringify(config)})`,
        );
    } finally {
        await session.close();
    }
}

/**
 * Lista los cines disponibles en la cadena correspondiente.
 * @returns Lista de resultados encontrados o transformados.
 */
export async function listCinemas(): Promise<CinepolisCinema[]> {
    return CINES_CINEPOLIS;
}

/**
 * Extrae desde Cinépolis los datos necesarios para construir la cartelera.
 * @param options Opciones que controlan la consulta o transformación.
 * @returns Resultado de la operación, incluidos los registros procesados.
 */
export async function scrapeCinepolis(
    options: ScrapeOptions,
    { diagnostico = false }: { diagnostico?: boolean } = {},
): Promise<ScrapeResult> {
    const debug = DEBUG && !diagnostico;
    if (!FECHA_RE.test(options.desde)) {
        throw new Error(
            `Fecha "desde" inválida: ${options.desde}. Usa YYYY-MM-DD.`,
        );
    }

    const startedAt = new Date().toISOString();
    const allCinemas = await listCinemas();
    const selected = resolverCines(allCinemas, options.cines);
    const maxDate = options.dias
        ? sumarDias(options.desde, options.dias - 1)
        : null;

    const incidencias: Incidencia[] = [];
    let errores = 0;
    const registrar = (
        tipo: string,
        severidad: Severidad,
        mensaje: string,
        extra: Record<string, unknown> = {},
    ) => {
        if (severidad === "error") {
            errores++;
            incidencias.push(incidencia(tipo, severidad, mensaje, extra));
        } else if (debug) {
            console.error(`[cinepolis][${severidad}] ${tipo}: ${mensaje}`);
        }
    };

    const config = {
        apiUrl: API_URL,
        apiKey: API_KEY,
        countryId: COUNTRY_ID,
        timezone: ZONA,
        movieLimit: 120,
        concurrency: 4,
        pausaMs: 200,
        debug,
        cinemas: selected.map((c) => ({
            id: c.id,
            candidatos: [c.id, c.vistaId],
        })),
    };
    const raw = await obtenerDatos(config, diagnostico);

    if (debug) guardarDebug(raw);

    for (const e of raw.errores) {
        registrar(e.tipo, "error", `Error consultando ${e.tipo}.`, {
            detalle: e,
        });
    }

    const movieMap = new Map<string, ReturnType<typeof movieDesdeApi>>();
    for (const rawM of raw.movies) {
        if (!rawM || !rawM.id) continue;
        movieMap.set(rawM.id, movieDesdeApi(rawM));
    }

    const peliculaPara = (movieId: string) => {
        const existente = movieMap.get(movieId);
        if (existente) return existente;
        registrar(
            "pelicula_fuera_de_cartelera",
            "aviso",
            `La película ${movieId} aparece en horarios pero no en la cartelera; se usan datos mínimos.`,
            { movieId },
        );
        const minima = peliculaMinima(movieId);
        movieMap.set(movieId, minima);
        return minima;
    };

    const cines: ScrapedCinema[] = [];
    const peliculas: ScrapedMovie[] = [];
    const horarios: ScrapedSchedule[] = [];
    const usedMovieIds = new Set<string>();
    const vistos = new Set<string>();
    let sesionesLeidas = 0;
    let cinesConRespuesta = 0;

    for (const cinema of selected) {
        try {
            cines.push(normalizeCinema(cinema, startedAt));
        } catch (err) {
            registrar("cine_descartado", "error", mensajeError(err), {
                cineId: cinema.id,
            });
            continue;
        }

        const bb = raw.billboards[cinema.id];
        if (!bb || bb.estado === "error") {
            registrar(
                "cine_error_api",
                "error",
                `No se pudo obtener la cartelera de ${cinema.name}.`,
                {
                    cineId: cinema.id,
                    intentos: bb?.intentos ?? [],
                },
            );
            continue;
        }
        cinesConRespuesta++;

        if (bb.estado === "vacio" || bb.schedules.length === 0) {
            registrar(
                "cine_sin_funciones",
                "info",
                `${cinema.name} no tiene funciones en la consulta.`,
                {
                    cineId: cinema.id,
                },
            );
            continue;
        }

        for (const sched of bb.schedules) {
            const movie = peliculaPara(sched.movieId);

            for (const dia of sched.dates ?? []) {
                const fecha = txt(dia.date) ?? "";
                if (!FECHA_RE.test(fecha)) {
                    registrar(
                        "fecha_invalida",
                        "aviso",
                        `Fecha no reconocida: ${dia.date}`,
                        {
                            cineId: cinema.id,
                            movieId: movie.id,
                        },
                    );
                    continue;
                }
                if (fecha < options.desde) continue;
                if (maxDate && fecha > maxDate) continue;

                for (const idioma of dia.languages ?? []) {
                    const lang = idiomaDesde(idioma);

                    for (const st of idioma.showtimes ?? []) {
                        sesionesLeidas++;
                        const sessionId = txt(st.sessionId);
                        const hora = horaLocal(txt(st.datetime));
                        if (!sessionId || !hora) {
                            registrar(
                                "sesion_invalida",
                                "aviso",
                                "Función sin id u hora válida.",
                                {
                                    cineId: cinema.id,
                                    movieId: movie.id,
                                    fecha,
                                    datetime: st.datetime ?? null,
                                },
                            );
                            continue;
                        }

                        const clave = `${cinema.id}:${sessionId}`;
                        if (vistos.has(clave)) continue;
                        vistos.add(clave);

                        const sesion = showtimeDesdeApi(st, {
                            cinema,
                            movie,
                            fecha,
                            hora,
                            idioma: lang,
                        });

                        try {
                            horarios.push(
                                normalizeSchedule(
                                    sesion,
                                    movie,
                                    cinema,
                                    startedAt,
                                ),
                            );
                            usedMovieIds.add(movie.id);
                        } catch (err) {
                            registrar(
                                "sesion_descartada",
                                "error",
                                mensajeError(err),
                                { sessionId, cineId: cinema.id },
                            );
                        }
                    }
                }
            }
        }
    }

    for (const movieId of usedMovieIds) {
        const movie = movieMap.get(movieId);
        if (!movie) continue;
        if (movie.datosIncompletos) {
            registrar(
                "pelicula_datos_incompletos",
                "aviso",
                `Datos incompletos para "${movie.title}".`,
                { movieId },
            );
        }
        try {
            peliculas.push(normalizeMovie(movie, startedAt));
        } catch (err) {
            registrar("pelicula_descartada", "error", mensajeError(err), {
                movieId,
            });
        }
    }

    if (debug) {
        console.error(
            `[cinepolis] cines con respuesta: ${cinesConRespuesta}/${selected.length} · ` +
                `funciones: ${horarios.length} · películas: ${peliculas.length} · incidencias: ${incidencias.length}`,
        );
    }

    const resultado: ScrapeResult = {
        peliculas,
        cines,
        funciones: [],
        horarios,
        incidencias,
        meta: {
            origen: "cinepolis",
            version: 1,
            modo: "cartelera",
            iniciadoEn: startedAt,
            terminadoEn: localNow(),
            completo: errores === 0,
            desde: options.desde,
            dias: options.dias,
            limitePorCine: options.limitePorCine,
            cinesDisponibles: allCinemas.length,
            cinesSeleccionados: selected.length,
            cinesProcesados: cinesConRespuesta,
            sesionesConsultadas: sesionesLeidas,
            moneda: "CLP",
            zonaHoraria: ZONA,
            precioIncluyeServicio: false,
        },
    };

    return resultado;
}
