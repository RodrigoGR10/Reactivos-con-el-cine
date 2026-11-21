import {
    buscarPeliculas,
    duracionValida,
    exigirApiKey,
    extraerMetricasTmdb,
    obtenerDetalleSilencioso,
    obtenerPosterLimpioSilencioso,
    urlBanner,
    urlPoster,
} from "./client.ts";
import {
    buildTargetTitles,
    parseMovieTitleForSearch,
    type ParsedMovieSearch,
} from "./consulta.ts";
import {
    MIN_CANDIDATE_SCORE,
    MIN_TITLE_SCORE,
    STRONG_CANDIDATE_SCORE,
    STRONG_TITLE_SCORE,
    scoreCandidate,
} from "./puntaje.ts";
import { detectarTipoContenido } from "./tipo-contenido.ts";
import type {
    SegundoCandidatoTmdb,
    TmdbMatchDiagnostic,
    TmdbMovieDetail,
    TmdbMovieResult,
} from "./types.ts";

interface EvaluacionCandidato {
    item: TmdbMovieResult;
    score: number;
    bestTitleScore: number;
    query: string;
    matchedPrimary: boolean;
}

function normalizarDuracionLocal(
    duracion: number | null | undefined,
): number | undefined {
    return typeof duracion === "number" &&
        Number.isFinite(duracion) &&
        duracion > 0
        ? duracion
        : undefined;
}

function diferencia(
    local: number | undefined,
    tmdb: number | undefined,
): number | undefined {
    return local !== undefined && tmdb !== undefined
        ? Math.abs(local - tmdb)
        : undefined;
}

function descripcionSegundoCandidato(
    second: EvaluacionCandidato | undefined,
    secondDetail: TmdbMovieDetail | null,
    duracionLocal: number | undefined,
): SegundoCandidatoTmdb | undefined {
    if (!second) return undefined;

    const duracionTmdb = duracionValida(secondDetail?.runtime);
    return {
        tmdbId: second.item.id,
        titulo: second.item.title,
        tituloOriginal: second.item.original_title,
        fechaEstreno: second.item.release_date,
        score: Math.round(second.score),
        duracionTmdb,
        diferenciaDuracion: diferencia(duracionLocal, duracionTmdb),
    };
}

function coincideTituloFuerte(
    parsed: ParsedMovieSearch,
    bestTitleScore: number,
    finalScore: number,
): boolean {
    if (parsed.isFestival) {
        return (
            bestTitleScore >= STRONG_TITLE_SCORE &&
            finalScore >= STRONG_CANDIDATE_SCORE
        );
    }

    return (
        finalScore >= MIN_CANDIDATE_SCORE && bestTitleScore >= MIN_TITLE_SCORE
    );
}

export async function diagnosticarPeliculaTmdb(
    titulo: string,
    apiKey = process.env.TMDB_API_KEY,
    duracionEsperada?: number | null,
    tituloOriginal?: string | null,
    origenId?: string | null,
): Promise<TmdbMatchDiagnostic | null> {
    const clave = exigirApiKey(apiKey);
    const duracionLocal = normalizarDuracionLocal(duracionEsperada);
    const searchOptions = {
        tituloOriginal,
        duracion: duracionLocal,
        origenId,
    };

    const parsed = parseMovieTitleForSearch(titulo, searchOptions);
    const targetTitles = buildTargetTitles(parsed, searchOptions);
    const isLiveEvent = /\b(?:LIVE VIEWING|WORLD TOUR|CONCERT|TOUR)\b/i.test(
        titulo,
    );

    const candidatesById = new Map<number, EvaluacionCandidato>();
    const detailCache = new Map<number, TmdbMovieDetail | null>();

    const considerResults = (
        results: TmdbMovieResult[],
        query: string,
        indice: number,
    ) => {
        for (const item of results) {
            const { score, bestTitleScore } = scoreCandidate(
                item,
                targetTitles,
                parsed,
            );
            const prev = candidatesById.get(item.id);
            if (!prev || score > prev.score) {
                candidatesById.set(item.id, {
                    item,
                    score,
                    bestTitleScore,
                    query,
                    matchedPrimary: indice < parsed.titulosPrincipales.length,
                });
            }
        }
    };

    const getEsMxDetail = async (
        id: number,
    ): Promise<TmdbMovieDetail | null> => {
        if (!detailCache.has(id)) {
            detailCache.set(
                id,
                await obtenerDetalleSilencioso(id, clave, "es-MX"),
            );
        }
        return detailCache.get(id) ?? null;
    };

    const hasStrongCandidate = () => {
        const top = [...candidatesById.values()].sort(
            (a, b) => b.score - a.score,
        )[0];
        return Boolean(
            top &&
            top.score >= STRONG_CANDIDATE_SCORE &&
            top.bestTitleScore >= STRONG_TITLE_SCORE,
        );
    };

    const pickValidated = async () => {
        const ranked = [...candidatesById.values()]
            .filter(
                (candidate) =>
                    candidate.score >= MIN_CANDIDATE_SCORE &&
                    candidate.bestTitleScore >= MIN_TITLE_SCORE,
            )
            .sort((a, b) => b.score - a.score);

        let winner: {
            candidate: EvaluacionCandidato;
            detail: TmdbMovieDetail | null;
            finalScore: number;
        } | null = null;

        for (const candidate of ranked.slice(0, 3)) {
            const detail = await getEsMxDetail(candidate.item.id);
            let finalScore = candidate.score;

            if (
                !isLiveEvent &&
                detail?.runtime &&
                detail.runtime > 0 &&
                duracionLocal
            ) {
                const diff = Math.abs(detail.runtime - duracionLocal);
                if (diff > 30) {
                    finalScore -= 50;
                } else if (diff <= 10) {
                    finalScore += 10;
                }
            }

            if (
                finalScore >= MIN_CANDIDATE_SCORE &&
                (!winner || finalScore > winner.finalScore)
            ) {
                winner = { candidate, detail, finalScore };
            }
        }

        return { winner, ranked };
    };

    for (let i = 0; i < parsed.queries.length; i++) {
        const query = parsed.queries[i]!;
        considerResults(await buscarPeliculas(query, clave, "es-MX"), query, i);
        if (hasStrongCandidate()) break;
    }

    let { winner, ranked } = await pickValidated();

    if (
        !parsed.isFestival &&
        (!winner || winner.candidate.bestTitleScore < STRONG_TITLE_SCORE)
    ) {
        for (let i = 0; i < parsed.queries.length; i++) {
            const query = parsed.queries[i]!;
            considerResults(
                await buscarPeliculas(query, clave, "en-US"),
                query,
                i,
            );
            if (hasStrongCandidate()) break;
        }
        ({ winner, ranked } = await pickValidated());
    }

    if (!winner) {
        const fallback = [...candidatesById.values()].sort(
            (a, b) => b.score - a.score,
        )[0];
        if (!fallback) return null;

        const detail = await getEsMxDetail(fallback.item.id);
        const duracionTmdb = duracionValida(detail?.runtime);

        return {
            tmdbId: fallback.item.id,
            tituloTmdb: fallback.item.title,
            tipoDetectado: detectarTipoContenido(titulo),
            tituloOriginal: fallback.item.original_title,
            fechaEstreno: fallback.item.release_date,
            score: Math.round(fallback.score),
            duracionTmdb,
            diferenciaDuracion: diferencia(duracionLocal, duracionTmdb),
            consultaCoincidente: fallback.query,
            coincideConsultaPrincipal: fallback.matchedPrimary,
            poster: urlPoster(detail?.poster_path ?? fallback.item.poster_path),
            banner: urlBanner(
                detail?.backdrop_path ?? fallback.item.backdrop_path,
            ),
            sinopsis: detail?.overview?.trim() || undefined,
            ...extraerMetricasTmdb(detail ?? fallback.item),
            estado: "DUDOSO",
        };
    }

    let sinopsis = winner.detail?.overview?.trim() || undefined;
    if (!sinopsis) {
        const esEsDetail = await obtenerDetalleSilencioso(
            winner.candidate.item.id,
            clave,
            "es-ES",
        );
        if (esEsDetail?.overview?.trim()) {
            sinopsis = esEsDetail.overview.trim();
        }
    }

    const posterPath =
        winner.detail?.poster_path ?? winner.candidate.item.poster_path;
    const backdropPath =
        winner.detail?.backdrop_path ?? winner.candidate.item.backdrop_path;
    const duracionTmdb = duracionValida(winner.detail?.runtime);
    const second = ranked.find(
        (candidate) => candidate.item.id !== winner.candidate.item.id,
    );
    const secondDetail = second
        ? (detailCache.get(second.item.id) ?? null)
        : null;

    const tipoDetectado = detectarTipoContenido(titulo);
    const seguro = coincideTituloFuerte(
        parsed,
        winner.candidate.bestTitleScore,
        winner.finalScore,
    );
    const posterLimpio = seguro
        ? await obtenerPosterLimpioSilencioso(winner.candidate.item.id, clave)
        : undefined;

    return {
        tmdbId: winner.candidate.item.id,
        tituloTmdb: winner.candidate.item.title,
        tipoDetectado,
        tituloOriginal: winner.candidate.item.original_title,
        fechaEstreno:
            winner.detail?.release_date ?? winner.candidate.item.release_date,
        score: Math.round(winner.finalScore),
        duracionTmdb,
        diferenciaDuracion: diferencia(duracionLocal, duracionTmdb),
        consultaCoincidente: winner.candidate.query,
        coincideConsultaPrincipal:
            winner.candidate.matchedPrimary ||
            winner.candidate.bestTitleScore >= STRONG_TITLE_SCORE,
        segundoCandidato: descripcionSegundoCandidato(
            second,
            secondDetail,
            duracionLocal,
        ),
        poster: urlPoster(posterPath),
        posterLimpio,
        banner: urlBanner(backdropPath),
        sinopsis,
        ...extraerMetricasTmdb(winner.detail ?? winner.candidate.item),
        estado: seguro ? "SEGURO" : "DUDOSO",
    };
}
