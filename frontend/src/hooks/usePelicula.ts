import { useEffect, useMemo, useRef, useState } from "react";
import type { Pelicula } from "../types/types";
import peliculaService from "../services/peliculas";
import { seleccionarDestacadasConCategoria } from "../utils/seleccionarDestacadas";

let peliculasEnMemoria: Pelicula[] = [];

function crearRngConSemilla(semilla: number): () => number {
    let estado = semilla >>> 0;
    return () => {
        estado = (estado + 0x6d2b79f5) | 0;
        let t = Math.imul(estado ^ (estado >>> 15), 1 | estado);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function mismaPelicula(a: Pelicula, b: Pelicula): boolean {
    return (
        a.id === b.id &&
        a.titulo === b.titulo &&
        a.duracion === b.duracion &&
        a.genero === b.genero &&
        a.clasificacion === b.clasificacion &&
        a.sinopsis === b.sinopsis &&
        a.poster === b.poster &&
        a.posterLimpio === b.posterLimpio &&
        a.banner === b.banner &&
        a.trailerUrl === b.trailerUrl &&
        a.trailerVersion === b.trailerVersion &&
        a.estadoEstreno === b.estadoEstreno &&
        a.fechaEstreno === b.fechaEstreno &&
        a.totalFavoritos === b.totalFavoritos &&
        a.totalCines === b.totalCines &&
        a.totalFunciones === b.totalFunciones &&
        a.calificacionTmdb === b.calificacionTmdb &&
        a.votosTmdb === b.votosTmdb &&
        a.popularidadTmdb === b.popularidadTmdb &&
        a.fechaEstrenoTmdb === b.fechaEstrenoTmdb
    );
}

function mismasPeliculas(actuales: Pelicula[], nuevas: Pelicula[]): boolean {
    return (
        actuales.length === nuevas.length &&
        actuales.every((pelicula, indice) =>
            mismaPelicula(pelicula, nuevas[indice]),
        )
    );
}

export function usePeliculas() {
    const hayDatos = useRef(peliculasEnMemoria.length > 0);
    const [semillaDestacadas] = useState(() =>
        Math.floor(Math.random() * 2 ** 32),
    );
    const [peliculas, setPeliculas] = useState<Pelicula[]>(
        () => peliculasEnMemoria,
    );
    const [cargando, setCargando] = useState(
        () => peliculasEnMemoria.length === 0,
    );
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelado = false;
        const controller = new AbortController();

        const cargar = async () => {
            try {
                const data = await peliculaService.getCartelera(
                    controller.signal,
                );

                if (!cancelado) {
                    const disponibles = data.filter(
                        (pelicula) => pelicula.estadoEstreno !== "proximamente",
                    );
                    if (!mismasPeliculas(peliculasEnMemoria, disponibles)) {
                        peliculasEnMemoria = disponibles;
                        setPeliculas(disponibles);
                    }
                    hayDatos.current = true;
                    setError(null);
                }
            } catch {
                if (!cancelado && !hayDatos.current)
                    setError("No se pudieron cargar las películas.");
            } finally {
                if (!cancelado) setCargando(false);
            }
        };

        void cargar();

        return () => {
            cancelado = true;
            controller.abort();
        };
    }, []);

    const peliculasDestacadas = useMemo(
        () =>
            seleccionarDestacadasConCategoria(peliculas, {
                rng: crearRngConSemilla(semillaDestacadas),
            }),
        [peliculas, semillaDestacadas],
    );

    return { peliculas, peliculasDestacadas, cargando, error };
}
