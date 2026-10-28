import {
    buscarPeliculas,
    exigirApiKey,
    obtenerDuracion,
    obtenerSinopsisRespaldo,
    urlBanner,
    urlPoster,
} from "./client.ts";
import { parseMovieTitleForSearch } from "./consulta.ts";
import { esCoincidenciaExacta, puntuarCandidato } from "./puntaje.ts";
import { detectarTipoContenido } from "./tipo-contenido.ts";
import type {
    SegundoCandidatoTmdb,
    TipoContenido,
    TmdbMatchDiagnostic,
    TmdbMovieResult,
} from "./types.ts";

const PUNTAJE_MINIMO_SEGURO = 70;
const MARGEN_MINIMO_ENTRE_CANDIDATOS = 15;
const DURACION_CERCANA_MIN = 10;
const DURACION_LEJANA_MIN = 15;
const SEPARACION_DURACION_MIN = 10;

interface Candidato {
    movie: TmdbMovieResult;
    score: number;
    matchedPrimary: boolean;
    exactPrimaryTitle: boolean;
    query: string;
}

// ---------- Búsqueda y ranking ----------

function debeReemplazar(previo: Candidato, nuevo: Candidato): boolean {
    return (
        (nuevo.matchedPrimary && !previo.matchedPrimary) ||
        (nuevo.matchedPrimary === previo.matchedPrimary &&
            nuevo.score > previo.score)
    );
}

async function reunirCandidatos(
    queries: string[],
    year: number | undefined,
    apiKey: string,
): Promise<Map<number, Candidato>> {
    const candidatos = new Map<number, Candidato>();

    for (let indice = 0; indice < queries.length; indice++) {
        const query = queries[indice]!;
        const results = await buscarPeliculas(query, apiKey, "es-MX");

        for (const movie of results) {
            const nuevo: Candidato = {
                movie,
                // Cada resultado se evalúa contra la consulta que realmente lo encontró.
                score: puntuarCandidato(movie, query, year),
                matchedPrimary: indice === 0,
                exactPrimaryTitle: esCoincidenciaExacta(movie, queries[0]!),
                query,
            };

            const previo = candidatos.get(movie.id);

            if (!previo || debeReemplazar(previo, nuevo)) {
                candidatos.set(movie.id, nuevo);
            }
        }
    }

    return candidatos;
}

function ordenarCandidatos(candidatos: Map<number, Candidato>): Candidato[] {
    return [...candidatos.values()].sort(
        (a, b) =>
            b.score - a.score ||
            Number(b.exactPrimaryTitle) - Number(a.exactPrimaryTitle) ||
            Number(b.matchedPrimary) - Number(a.matchedPrimary),
    );
}

// ---------- Duraciones ----------

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

async function obtenerDuraciones(
    best: Candidato,
    second: Candidato | undefined,
    duracionLocal: number | undefined,
    apiKey: string,
): Promise<{ duracionTmdb?: number; segundaDuracionTmdb?: number }> {
    if (duracionLocal === undefined) return {};

    const [duracionTmdb, segundaDuracionTmdb] = await Promise.all([
        obtenerDuracion(best.movie.id, apiKey).catch(() => undefined),
        second
            ? obtenerDuracion(second.movie.id, apiKey).catch(() => undefined)
            : Promise.resolve(undefined),
    ]);

    return { duracionTmdb, segundaDuracionTmdb };
}

// ---------- Decisión: ¿coincidencia segura? ----------

function coincideAnio(movie: TmdbMovieResult, year: number | undefined) {
    return (
        year === undefined ||
        (movie.release_date !== undefined &&
            Number(movie.release_date.slice(0, 4)) === year)
    );
}

function duracionDistingueCandidato(
    diferenciaBest: number | undefined,
    diferenciaSegundo: number | undefined,
): boolean {
    return (
        diferenciaBest !== undefined &&
        diferenciaSegundo !== undefined &&
        diferenciaBest <= DURACION_CERCANA_MIN &&
        diferenciaSegundo >= DURACION_LEJANA_MIN &&
        diferenciaSegundo - diferenciaBest >= SEPARACION_DURACION_MIN
    );
}

interface EvidenciaSeguridad {
    best: Candidato;
    second: Candidato | undefined;
    exactos: Candidato[];
    year: number | undefined;
    diferenciaBest: number | undefined;
    diferenciaSegundo: number | undefined;
    tipoDetectado: TipoContenido;
}

function esCoincidenciaSegura(e: EvidenciaSeguridad): boolean {
    const unicoExacto =
        e.best.exactPrimaryTitle &&
        e.exactos.length === 1 &&
        e.exactos[0]!.movie.id === e.best.movie.id;

    const margenSuficiente =
        e.second !== undefined &&
        e.best.score - e.second.score >= MARGEN_MINIMO_ENTRE_CANDIDATOS;

    return (
        e.best.score >= PUNTAJE_MINIMO_SEGURO &&
        e.best.matchedPrimary &&
        (unicoExacto ||
            margenSuficiente ||
            duracionDistingueCandidato(
                e.diferenciaBest,
                e.diferenciaSegundo,
            )) &&
        coincideAnio(e.best.movie, e.year) &&
        e.tipoDetectado === "DESCONOCIDO"
    );
}

// ---------- Resultado ----------

function describirSegundoCandidato(
    second: Candidato | undefined,
    duracionTmdb: number | undefined,
    diferenciaDuracion: number | undefined,
): SegundoCandidatoTmdb | undefined {
    if (!second) return undefined;

    return {
        tmdbId: second.movie.id,
        titulo: second.movie.title,
        tituloOriginal: second.movie.original_title,
        fechaEstreno: second.movie.release_date,
        score: second.score,
        duracionTmdb,
        diferenciaDuracion,
    };
}

export async function diagnosticarPeliculaTmdb(
    titulo: string,
    apiKey = process.env.TMDB_API_KEY,
    duracionEsperada?: number | null,
): Promise<TmdbMatchDiagnostic | null> {
    const clave = exigirApiKey(apiKey);
    const { queries, year } = parseMovieTitleForSearch(titulo);

    const ranked = ordenarCandidatos(
        await reunirCandidatos(queries, year, clave),
    );

    if (ranked.length === 0) return null;

    const best = ranked[0]!;
    const movie = best.movie;

    // Los candidatos que coinciden con el título completo
    // tienen prioridad sobre los que solo coinciden con el título base.
    const exactos = ranked.filter((candidato) => candidato.exactPrimaryTitle);
    const second = exactos.length > 1 ? exactos[1] : undefined;

    const duracionLocal = normalizarDuracionLocal(duracionEsperada);
    const { duracionTmdb, segundaDuracionTmdb } = await obtenerDuraciones(
        best,
        second,
        duracionLocal,
        clave,
    );

    const diferenciaDuracion = diferencia(duracionLocal, duracionTmdb);
    const segundaDiferenciaDuracion = diferencia(
        duracionLocal,
        segundaDuracionTmdb,
    );

    const sinopsis =
        movie.overview?.trim() ||
        (await obtenerSinopsisRespaldo(movie.id, clave));

    const tipoDetectado = detectarTipoContenido(titulo);

    const seguro = esCoincidenciaSegura({
        best,
        second,
        exactos,
        year,
        diferenciaBest: diferenciaDuracion,
        diferenciaSegundo: segundaDiferenciaDuracion,
        tipoDetectado,
    });

    return {
        tmdbId: movie.id,
        tituloTmdb: movie.title,
        tipoDetectado,
        tituloOriginal: movie.original_title,
        fechaEstreno: movie.release_date,
        score: best.score,
        duracionTmdb,
        diferenciaDuracion,
        consultaCoincidente: best.query,
        coincideConsultaPrincipal: best.matchedPrimary,
        segundoCandidato: describirSegundoCandidato(
            second,
            segundaDuracionTmdb,
            segundaDiferenciaDuracion,
        ),
        poster: urlPoster(movie.poster_path),
        banner: urlBanner(movie.backdrop_path),
        sinopsis,
        estado: seguro ? "SEGURO" : "DUDOSO",
    };
}
