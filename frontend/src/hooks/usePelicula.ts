
import { useEffect, useMemo, useState } from "react";
import { usePeliculasStore } from "../stores/peliculasStore";
import { seleccionarDestacadasConCategoria } from "../utils/seleccionarDestacadas";

/**
 * Genera números pseudoaleatorios a partir de una semilla.
 * Permite que la selección de destacadas sea estable durante la sesión.
 */
function crearRngConSemilla(semilla: number): () => number {
    let estado = semilla >>> 0;

    return () => {
        estado = (estado + 0x6d2b79f5) | 0;

        let t = Math.imul(
            estado ^ (estado >>> 15),
            1 | estado,
        );

        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * Carga y conserva en memoria la cartelera y calcula sus películas destacadas.
 *
 * @returns Películas disponibles, destacadas y estados de carga o error.
 */
export function usePeliculas() {
    const [semillaDestacadas] = useState(() =>
        Math.floor(Math.random() * 2 ** 32),
    );

    const peliculasOriginales = usePeliculasStore(
        (state) => state.peliculas,
    );

    const cargando = usePeliculasStore(
        (state) => state.cargando,
    );

    const cargada = usePeliculasStore(
        (state) => state.isLoaded,
    );

    const errorCarga = usePeliculasStore(
        (state) => state.error,
    );

    const cargarPeliculas = usePeliculasStore(
        (state) => state.cargarPeliculas,
    );

    useEffect(() => {
        void cargarPeliculas();
    }, [cargarPeliculas]);

    const peliculas = useMemo(
        () =>
            peliculasOriginales.filter(
                (pelicula) =>
                    pelicula.estadoEstreno !== "proximamente",
            ),
        [peliculasOriginales],
    );

    const peliculasDestacadas = useMemo(
        () =>
            seleccionarDestacadasConCategoria(peliculas, {
                rng: crearRngConSemilla(semillaDestacadas),
            }),
        [peliculas, semillaDestacadas],
    );

    return {
        peliculas,
        peliculasDestacadas,
        cargando,
        error: errorCarga && !cargada ? errorCarga : null,
    };
}
