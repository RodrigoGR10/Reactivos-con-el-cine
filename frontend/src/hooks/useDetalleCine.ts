import { useEffect, useState } from "react";
import axios from "axios";
import type { Cine, Pelicula, Horario } from "../types/types";
import cinesService from "../services/cines";
import funcionesService from "../services/funciones";
import peliculasService from "../services/peliculas";

const HORARIOS_VACIOS: Horario[] = [];

/**
 * Carga el cine, su cartelera y el catálogo de películas.
 * Centraliza el ciclo de vida de los datos (carga, error y 404) para la vista de detalle.
 */

export function useDetalleCine(id?: string) {
    const [cineEstado, setCineEstado] = useState<Cine | null>(null);
    const [horariosEstado, setHorariosEstado] = useState<Horario[]>([]);
    const [peliculasEstado, setPeliculasEstado] = useState<Pelicula[]>([]);
    const [idCargado, setIdCargado] = useState<string>();
    const [errorCarga, setErrorCarga] = useState<string | null>(null);
    const [noEncontradoCarga, setNoEncontradoCarga] = useState(false);

    useEffect(() => {
        if (!id) return;
        let cancelado = false;

        Promise.all([
            cinesService.getById(id),
            funcionesService.getHorariosByCine(id),
            peliculasService.getAll(),
        ])
            .then(([cineData, horariosData, peliculasData]) => {
                if (cancelado) return;
                setErrorCarga(null);
                setNoEncontradoCarga(false);
                setCineEstado(cineData);
                setHorariosEstado(horariosData);
                setPeliculasEstado(peliculasData);
                setIdCargado(id);
            })
            .catch((err: unknown) => {
                if (cancelado) return;
                const es404 =
                    axios.isAxiosError(err) && err.response?.status === 404;
                setCineEstado(null);
                setNoEncontradoCarga(es404);
                setErrorCarga(
                    es404
                        ? "El cine que buscas no existe o ya no está disponible."
                        : "No se pudo cargar la información del cine o su cartelera.",
                );
                setIdCargado(id);
            });

        return () => {
            cancelado = true;
        };
    }, [id]);

    const cargando = Boolean(id && idCargado !== id);
    const cargado = Boolean(id && idCargado === id);

    return {
        cine: cargado ? cineEstado : null,
        horarios: cargado ? horariosEstado : HORARIOS_VACIOS,
        peliculas: cargado ? peliculasEstado : [],
        cargando,
        noEncontrado: !id || (cargado && noEncontradoCarga),
        error: id
            ? cargado
                ? errorCarga
                : null
            : "El cine que buscas no existe o ya no está disponible.",
    };
}
