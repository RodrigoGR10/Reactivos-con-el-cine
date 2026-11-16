import { cinemarkData, ensureCinemark } from "./client.ts";
import {
    normalizeCinema,
    normalizeMovie,
    normalizeSchedule,
    sessionDateTime,
} from "./normalize.ts";
import { isDate, localNow } from "../normalize.ts";
import type { RawCinema, RawMovie, RawSession } from "./types.ts";
import type {
    Incident,
    ScrapedMovie,
    ScrapeOptions,
    ScrapeResult,
} from "../types.ts";

export async function listCinemas(): Promise<RawCinema[]> {
    await ensureCinemark();

    const cinemas = await cinemarkData<RawCinema[]>("/cinema/theaters", {
        limit: String(Number.MAX_SAFE_INTEGER),
    });
    if (!Array.isArray(cinemas) || !cinemas.length)
        throw new Error("Cinemark no devolvio cines.");
    if (
        new Set(cinemas.map((cinema) => String(cinema.id))).size !==
        cinemas.length
    )
        throw new Error("Cinemark devolvio cines duplicados.");
    return cinemas;
}

export async function scrapeCinemark(
    options: ScrapeOptions,
): Promise<ScrapeResult> {
    await ensureCinemark();
    const startedAt = new Date().toISOString();
    const allCinemas = await listCinemas();
    const selected = allCinemas.filter(
        (cinema) =>
            !options.cines.length ||
            options.cines.includes(String(cinema.id)) ||
            options.cines.includes(cinema.slug),
    );
    for (const selector of options.cines) {
        if (
            !selected.some(
                (cinema) =>
                    String(cinema.id) === selector || cinema.slug === selector,
            )
        )
            throw new Error(
                `Cine desconocido: ${selector}. Usa --list-cinemas.`,
            );
    }
    const result: ScrapeResult = {
        peliculas: [],
        cines: [],
        funciones: [],
        horarios: [],
        incidencias: [],
        meta: {
            origen: "cinemark",
            version: 1,
            modo: "cartelera",
            iniciadoEn: startedAt,
            completo: false,
            desde: options.desde,
            dias: options.dias,
            limitePorCine: options.limitePorCine,
            cinesSeleccionados: selected.length,
            cinesProcesados: 0,
            sesionesConsultadas: 0,
            cinesDisponibles: allCinemas.length,
            moneda: "CLP",
            zonaHoraria: "America/Santiago",
            precioIncluyeServicio: false,
        },
    };
    const until =
        options.dias === null
            ? null
            : new Date(
                  Date.parse(`${options.desde}T00:00:00Z`) +
                      options.dias * 86_400_000,
              )
                  .toISOString()
                  .slice(0, 10);
    const now = localNow();
    const movies = new Map<string, ScrapedMovie>();
    const failedMovies = new Set<string>();
    const sessionIds = new Set<string>();
    const moviesWithFutureSessions = new Set<string>();
    const addIncident = (incident: Incident) => {
        result.incidencias.push(incident);
        console.log(`  Aviso (${incident.etapa}): ${incident.mensaje}`);
    };
    for (const [index, cinema] of selected.entries()) {
        const cinemaId = String(cinema.id);
        console.log(`[${index + 1}/${selected.length}] ${cinema.name}`);
        try {
            const normalizedCinema = normalizeCinema(cinema, startedAt);
            const sessions = await cinemarkData<RawSession[]>(
                "/cinema/showtimes",
                { theater: cinemaId },
            );
            if (!Array.isArray(sessions))
                throw new Error("La cartelera no es una lista.");
            const relevant = sessions
                .filter((session) => {
                    try {
                        if (session.theaterId !== cinemaId)
                            throw new Error(
                                "La cartelera contiene funciones de otro cine.",
                            );
                        const { fecha, horario } = sessionDateTime(session);
                        const date = session.sessionDisplayDate;
                        if (!isDate(date))
                            throw new Error("Fecha de cartelera invalida.");
                        if (!session.corporateId?.trim())
                            throw new Error("Id de pelicula invalido.");
                        const future = `${fecha}T${horario}:59` >= now;
                        if (future)
                            moviesWithFutureSessions.add(session.corporateId);
                        return (
                            date >= options.desde &&
                            (!until || date < until) &&
                            future
                        );
                    } catch (error) {
                        addIncident({
                            cineId: cinemaId,
                            sesionId: session.sessionId,
                            etapa: "funcion",
                            mensaje: message(error),
                        });
                        return false;
                    }
                })
                .sort((a, b) =>
                    a.sessionDateTime.localeCompare(b.sessionDateTime),
                );
            const limited =
                options.limitePorCine === null
                    ? relevant
                    : relevant.slice(0, options.limitePorCine);
            result.cines.push(normalizedCinema);
            console.log(
                `  ${limited.length} horarios (${relevant.length} dentro del rango), sin consultar precios.`,
            );
            for (const session of limited) {
                const sessionKey = `${cinemaId}:${session.sessionId}`;
                if (sessionIds.has(sessionKey)) continue;
                sessionIds.add(sessionKey);
                result.meta.sesionesConsultadas++;
                if (
                    !movies.has(session.corporateId) &&
                    !failedMovies.has(session.corporateId)
                ) {
                    try {
                        const movie = await cinemarkData<RawMovie>(
                            `/cinema/movie/${encodeURIComponent(session.corporateId)}`,
                        );
                        if (movie.corporateId !== session.corporateId)
                            throw new Error(
                                "La pelicula recibida tiene otro id.",
                            );
                        const normalizedMovie = normalizeMovie(
                            movie,
                            startedAt,
                        );
                        result.peliculas.push(normalizedMovie);
                        movies.set(session.corporateId, normalizedMovie);
                    } catch (error) {
                        failedMovies.add(session.corporateId);
                        addIncident({
                            cineId: cinemaId,
                            peliculaId: session.corporateId,
                            etapa: "pelicula",
                            mensaje: message(error),
                        });
                    }
                }
                if (!movies.has(session.corporateId)) continue;
                try {
                    result.horarios!.push(
                        normalizeSchedule(session, startedAt),
                    );
                } catch (error) {
                    addIncident({
                        cineId: cinemaId,
                        peliculaId: session.corporateId,
                        sesionId: session.sessionId,
                        etapa: "funcion",
                        mensaje: message(error),
                    });
                }
            }
            result.meta.cinesProcesados++;
        } catch (error) {
            addIncident({
                cineId: cinemaId,
                etapa: "cine",
                mensaje: message(error),
            });
        }
    }
    result.meta.terminadoEn = new Date().toISOString();
    result.meta.peliculasConFuncionesFuturas = [
        ...moviesWithFutureSessions,
    ].sort();
    result.horarios!.sort(
        (a, b) =>
            a.cineId.localeCompare(b.cineId) ||
            `${a.fecha}T${a.horario}`.localeCompare(`${b.fecha}T${b.horario}`),
    );
    result.meta.completo =
        result.meta.cinesProcesados === selected.length &&
        result.incidencias.length === 0;
    return result;
}

function message(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}
