import { randomBytes } from "node:crypto";
import { fechaDeEstreno, isDate, scheduleRevision } from "../normalize.ts";
import { localNow } from "../../utils/localNow.ts";
import { normalizarSinopsis } from "../../utils/sinopsis.ts";
import { cineplanetData, SITE } from "./client.ts";
import type {
    ScrapedCinema,
    ScrapedMovie,
    ScrapedSchedule,
    ScrapedSession,
} from "../types.ts";
import type { Cinema, Movie, Session, Prices } from "./types.ts";

function text(value: string, field: string) {
    if (typeof value !== "string" || !value.trim())
        throw new Error(`Falta ${field} en Cineplanet.`);
    return value.trim();
}

export function normalizeCinema(
    cinema: Cinema,
    extractedAt: string,
): ScrapedCinema {
    const id = text(cinema.ID, "id de cine");
    return {
        id: `cineplanet:${id}`,
        origen: "cineplanet",
        origenId: id,
        extraidoEn: extractedAt,
        nombre: cinema.name.replace(/^CP\s+/i, "Cineplanet "),
        comuna: text(cinema.city, "ciudad"),
        ciudad: cinema.city,
        direccion: text(cinema.address, "direccion"),
        url: `${SITE}/cines/${encodeURIComponent(text(cinema.formattedCinemaName, "slug de cine"))}`,
        logo: `${SITE}/f09f64a439c124b7d2a6.svg`,
        ...(cinema.latitude && Number.isFinite(Number(cinema.latitude))
            ? { latitud: Number(cinema.latitude) }
            : {}),
        ...(cinema.longitude && Number.isFinite(Number(cinema.longitude))
            ? { longitud: Number(cinema.longitude) }
            : {}),
    };
}

export function normalizeMovie(
    movie: Movie,
    extractedAt: string,
): ScrapedMovie {
    const id = text(movie.id, "id de pelicula");
    if (!Number.isInteger(movie.runTime) || movie.runTime <= 0)
        throw new Error("Duracion de Cineplanet invalida.");
    return {
        id: `cineplanet:${id}`,
        origen: "cineplanet",
        origenId: id,
        extraidoEn: extractedAt,
        titulo: text(movie.title, "titulo"),
        duracion: movie.runTime,
        estadoEstreno: movie.isPreSale
            ? "preventa"
            : movie.isComingSoon
              ? "proximamente"
              : "cartelera",
        fechaEstreno: fechaDeEstreno(movie.OpeningDate),
        genero: text(movie.genre, "genero"),
        clasificacion: text(movie.ratingDescription, "clasificacion"),
        sinopsis: normalizarSinopsis(movie.synopsis),
        poster: text(movie.posterUrl, "poster"),
        url: `${SITE}/peliculas/${encodeURIComponent(text(movie.movieDetailsUrl, "slug de pelicula"))}`,
    };
}

export function normalizeSchedule(
    session: Session,
    movie: Movie,
    cinemaId: string,
    date: string,
    extractedAt: string,
): ScrapedSchedule {
    const local = localNow(new Date(session.showtime));
    if (
        !isDate(date) ||
        !isDate(local.slice(0, 10)) ||
        session.id !== `${cinemaId}-${session.sessionId}` ||
        !/^\d+$/.test(session.sessionId)
    )
        throw new Error("Identidad o fecha de funcion de Cineplanet invalida.");
    if (
        !Array.isArray(session.formats) ||
        !session.formats.length ||
        !Array.isArray(session.languages) ||
        !session.languages.length
    )
        throw new Error("Falta formato o idioma de Cineplanet.");
    const sourceId = `${cinemaId}:${session.sessionId}`;
    const idioma = session.languages
        .map((language) =>
            /^SUBTITULAD/i.test(language)
                ? "Subtitulada"
                : /^DOBLAD/i.test(language)
                  ? "Doblada"
                  : language,
        )
        .join(" / ");
    const schedule = {
        id: `cineplanet:${sourceId}`,
        origen: "cineplanet" as const,
        origenId: sourceId,
        extraidoEn: extractedAt,
        peliculaId: `cineplanet:${movie.id}`,
        cineId: `cineplanet:${cinemaId}`,
        sesionId: session.sessionId,
        fecha: local.slice(0, 10),
        horario: local.slice(11, 16),
        fechaCartelera: date,
        formatoResumen: session.formats
            .filter((format) => format !== "CONV")
            .map((format) => (format === "IV" ? "INFINITY VISION" : format))
            .join(" "),
        idioma,
        sala: "",
        agotada: false,
        urlCompra: `${SITE}/compra/${encodeURIComponent(movie.movieDetailsUrl)}/${cinemaId}/${session.sessionId}/asientos`,
    };
    return { ...schedule, revision: scheduleRevision(schedule) };
}

export function normalizePrices(
    response: Prices,
    schedule: ScrapedSchedule,
): ScrapedSession[] {
    if (response.ResponseCode !== 0 || !Array.isArray(response.Tickets))
        throw new Error("Cineplanet no devolvio una lista valida de tarifas.");
    const tarifas: ScrapedSession[] = [];
    const seen = new Set<string>();
    for (const ticket of response.Tickets) {
        if (ticket.CinemaId !== schedule.cineId.slice("cineplanet:".length))
            throw new Error("La tarifa de Cineplanet corresponde a otro cine.");
        const title = text(ticket.Description, "nombre de tarifa");
        const normalized = title
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toUpperCase();
        if (
            !/^(?:GENERAL|ADULTO)\b/.test(normalized) ||
            /PROMO|SOCIO|PACK|COMBO|CONVENIO|DESCUENTO|NINO|3RA|TERCERA|ESTUDIANTE|CUPON/.test(
                normalized,
            )
        )
            continue;
        if (
            ticket.IsChildOnlyTicket ||
            ticket.IsPackageTicket ||
            ticket.IsRedemptionTicket ||
            ticket.IsComplimentaryTicket ||
            ticket.IsThirdPartyMemberTicket ||
            ticket.IsAvailableForLoyaltyMembersOnly ||
            ticket.IsAvailableAsLoyaltyRecognitionOnly ||
            ticket.LoyaltyRecognitionId ||
            ticket.ThirdPartyMembershipName?.trim()
        )
            continue;
        if (!ticket.SalesChannels?.includes("WWW") || ticket.PriceInCents <= 0)
            continue;
        if (
            !Number.isSafeInteger(ticket.PriceInCents) ||
            ticket.PriceInCents % 100 !== 0
        )
            throw new Error("Precio de Cineplanet invalido.");
        const additional = ticket.TotalTicketFeeAmountInCents ?? 0;
        if (
            !Number.isSafeInteger(additional) ||
            additional < 0 ||
            additional % 100 !== 0
        )
            throw new Error("Cargo de servicio de Cineplanet invalido.");
        const included = ticket.LongDescription?.match(
            /incluye\s+(?:el\s+)?(?:cargo\s+(?:de|por)\s+)?servicio\s+online\s+de\s*\$\s*([\d.]+)/i,
        );
        const servicioIncluido = included
            ? Number(included[1].replaceAll(".", ""))
            : undefined;
        if (
            servicioIncluido !== undefined &&
            additional > 0 &&
            additional / 100 !== servicioIncluido
        )
            throw new Error(
                "Cineplanet publico cargos de servicio contradictorios.",
            );
        const precioOnline =
            (ticket.PriceInCents +
                (servicioIncluido === undefined ? additional : 0)) /
            100;
        const cargoServicio =
            servicioIncluido ?? (additional > 0 ? additional / 100 : undefined);
        if (
            cargoServicio !== undefined &&
            (!Number.isSafeInteger(cargoServicio) ||
                cargoServicio < 0 ||
                cargoServicio >= precioOnline)
        )
            throw new Error("Desglose de tarifa de Cineplanet invalido.");
        const sourceId = `${schedule.origenId}:${ticket.AreaCategoryCode}:${ticket.TicketTypeCode}`;
        if (seen.has(sourceId)) continue;
        seen.add(sourceId);
        tarifas.push({
            id: `cineplanet:${sourceId}`,
            origen: "cineplanet",
            origenId: sourceId,
            extraidoEn: new Date().toISOString(),
            peliculaId: schedule.peliculaId,
            cineId: schedule.cineId,
            fecha: schedule.fecha,
            fechaCartelera: schedule.fechaCartelera,
            horario: schedule.horario,
            formato: schedule.formatoResumen,
            idioma: schedule.idioma,
            sala: schedule.sala,
            precioOnline,
            ...(cargoServicio !== undefined
                ? { cargoServicio, precio: precioOnline - cargoServicio }
                : {}),
            tipoEntrada: title,
            urlCompra: text(schedule.urlCompra!, "enlace de compra"),
            agotada: schedule.agotada,
        });
    }
    return tarifas;
}

export async function pricesForSchedule(schedule: ScrapedSchedule) {
    const cinemaId = schedule.cineId.slice("cineplanet:".length);
    const response = await cineplanetData<Prices>(
        `/api/gettickets/cinema/${cinemaId}/session/${schedule.sesionId}/usersessionid/${randomBytes(16).toString("hex")}`,
    );
    return normalizePrices(response, schedule);
}
