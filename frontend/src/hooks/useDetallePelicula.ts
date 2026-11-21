import { useEffect, useState } from "react";
import axios from "axios";
import type { Pelicula, Cine, Horario } from "../types/types";
import peliculaService from "../services/peliculas";
import cineService from "../services/cines";
import funcionService from "../services/funciones";

export function useDetallePelicula(id?: string) {
    const [pelicula, setPelicula] = useState<Pelicula | null>(null);
    const [horarios, setHorarios] = useState<Horario[]>([]);
    const [idCargado, setIdCargado] = useState<string>();
    const [cines, setCines] = useState<Cine[]>([]);
    const [errorCarga, setErrorCarga] = useState<string | null>(null);
    const [noEncontradaCarga, setNoEncontradaCarga] = useState(false);

    useEffect(() => {
        if (!id) return;
        let cancelado = false;

        const cargar = async () => {
            try {
                const [peliculaData, horariosData, cinesData] =
                    await Promise.all([
                        peliculaService.getById(id),
                        funcionService.getHorarios(id),
                        cineService.getAll(),
                    ]);

                if (cancelado) return;
                setErrorCarga(null);
                setNoEncontradaCarga(false);
                setPelicula(peliculaData);
                setHorarios(horariosData);
                setIdCargado(id);
                setCines(cinesData);
            } catch (err: unknown) {
                if (!cancelado) {
                    const es404 =
                        axios.isAxiosError(err) && err.response?.status === 404;
                    setNoEncontradaCarga(es404);
                    setErrorCarga(
                        es404
                            ? "La película que buscas no existe o ya no está disponible."
                            : "No se pudo obtener la información. Intenta nuevamente.",
                    );
                    setIdCargado(id);
                }
            }
        };

        cargar();

        return () => {
            cancelado = true;
        };
    }, [id]);

    const noEncontrada = !id || (idCargado === id && noEncontradaCarga);
    const error = id
        ? idCargado === id
            ? errorCarga
            : null
        : "La película que buscas no existe o ya no está disponible.";

    return {
        pelicula: idCargado === id ? pelicula : null,
        horarios: idCargado === id ? horarios : [],
        cines: idCargado === id ? cines : [],
        error,
        noEncontrada,
    };
}
