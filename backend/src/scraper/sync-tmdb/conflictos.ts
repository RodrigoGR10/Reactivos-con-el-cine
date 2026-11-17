import { pool } from "../../db.ts";
import { areSameCatalogMovie } from "../tmdb/catalogo.ts";
import type {
    CandidatoSeguro,
    MovieRow,
    ResultadoDiagnostico,
} from "./types.ts";

import { claveParaConflictos } from "../../utils/titulos.ts";

interface PeliculaExistente {
    id: number;
    titulo: string;
    titulo_original: string | null;
    tmdb_id: number;
}

function sonTitulosCompatibles(
    a: { titulo: string; titulo_original?: string | null },
    b: { titulo: string; titulo_original?: string | null },
): boolean {
    const claveA = claveParaConflictos(a.titulo);
    const claveB = claveParaConflictos(b.titulo);
    if (claveA.length > 0 && claveA === claveB) {
        return true;
    }

    return areSameCatalogMovie(
        {
            titulo: a.titulo,
            tituloOriginal: a.titulo_original ?? undefined,
            duracion: 0,
        },
        {
            titulo: b.titulo,
            tituloOriginal: b.titulo_original ?? undefined,
            duracion: 0,
        },
    );
}

// tmdbId -> ids de películas locales que lo proponen.
function agruparPorTmdb(candidatos: CandidatoSeguro[]): Map<number, number[]> {
    const grupos = new Map<number, number[]>();

    for (const candidato of candidatos) {
        const grupo = grupos.get(candidato.tmdbId) ?? [];
        grupo.push(candidato.peliculaId);
        grupos.set(candidato.tmdbId, grupo);
    }

    return grupos;
}

// Los registros locales pueden compartir TMDB ID.
// Esto es informativo y nunca provoca una fusión.
function informarTmdbCompartidos(grupos: Map<number, number[]>): void {
    console.log("\n===== TMDB COMPARTIDOS =====");

    for (const [tmdbId, peliculaIds] of grupos) {
        if (peliculaIds.length > 1) {
            console.log(
                `TMDB ${tmdbId}: películas locales ${peliculaIds.join(", ")}. ` +
                    "Se conservarán como registros independientes.",
            );
        }
    }
}

async function buscarExistentes(
    tmdbIds: number[],
): Promise<PeliculaExistente[]> {
    if (tmdbIds.length === 0) return [];

    const result = await pool.query<PeliculaExistente>(
        `
        SELECT id, titulo, titulo_original, tmdb_id
        FROM peliculas
        WHERE tmdb_id = ANY($1::int[]);
        `,
        [tmdbIds],
    );

    return result.rows;
}

// Dos candidatos del mismo lote con el mismo TMDB ID pero títulos distintos.
function conflictosEntreCandidatos(
    grupos: Map<number, number[]>,
    moviesById: Map<number, MovieRow>,
): number[] {
    const ids: number[] = [];

    for (const [tmdbId, peliculaIds] of grupos) {
        if (peliculaIds.length < 2) continue;

        const peliculas = peliculaIds
            .map((peliculaId) => moviesById.get(peliculaId))
            .filter((movie): movie is MovieRow => Boolean(movie));

        for (let i = 0; i < peliculas.length; i++) {
            for (let j = i + 1; j < peliculas.length; j++) {
                const a = peliculas[i]!;
                const b = peliculas[j]!;

                if (sonTitulosCompatibles(a, b)) {
                    continue;
                }

                ids.push(a.id, b.id);

                console.warn(
                    `Conflicto entre candidatos para TMDB ${tmdbId}: ` +
                        `"${a.titulo}" (ID ${a.id}) y "${b.titulo}" (ID ${b.id}).`,
                );
            }
        }
    }

    return ids;
}

// Un candidato cuyo TMDB ID ya lo tiene otra película con título distinto.
function conflictosConExistentes(
    candidatos: CandidatoSeguro[],
    existentes: PeliculaExistente[],
    moviesById: Map<number, MovieRow>,
): number[] {
    const ids: number[] = [];

    for (const existente of existentes) {
        const mismoTmdb = candidatos.filter(
            (candidato) => candidato.tmdbId === existente.tmdb_id,
        );

        for (const candidato of mismoTmdb) {
            const peliculaNueva = moviesById.get(candidato.peliculaId);
            if (!peliculaNueva) continue;

            if (sonTitulosCompatibles(existente, peliculaNueva)) {
                continue;
            }

            ids.push(candidato.peliculaId);

            console.warn(
                `Conflicto TMDB ${existente.tmdb_id}: ` +
                    `"${peliculaNueva.titulo}" (ID ${peliculaNueva.id}) ` +
                    `frente a "${existente.titulo}" (ID ${existente.id})`,
            );
        }
    }

    return ids;
}

// Devuelve los ids de películas locales que NO deben actualizarse.
export async function detectarConflictos(
    candidatos: CandidatoSeguro[],
    moviesById: Map<number, MovieRow>,
): Promise<Set<number>> {
    const grupos = agruparPorTmdb(candidatos);
    informarTmdbCompartidos(grupos);

    const existentes = await buscarExistentes([...grupos.keys()]);

    return new Set([
        ...conflictosEntreCandidatos(grupos, moviesById),
        ...conflictosConExistentes(candidatos, existentes, moviesById),
    ]);
}

// Marca los resultados en conflicto y devuelve cuántos eran asignaciones manuales.
export function marcarConflictos(
    resultados: ResultadoDiagnostico[],
    conflictos: Set<number>,
): number {
    let manuales = 0;

    for (const resultado of resultados) {
        if (!conflictos.has(resultado.peliculaId)) continue;

        const eraManual = resultado.estado === "ASIGNADO_MANUALMENTE";

        resultado.decision = "OMITIR_CONFLICTO";
        resultado.estado = eraManual ? "CONFLICTO_MANUAL" : "CONFLICTO";

        if (eraManual) manuales++;
    }

    return manuales;
}
