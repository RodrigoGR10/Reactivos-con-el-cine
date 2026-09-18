import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { Pelicula, Cine, Funcion } from "../types/types";
import peliculaService from "../services/peliculas";
import cineService from "../services/cines";
import funcionService from "../services/funciones";
import { agruparFuncionesPorCine } from "../utils/agruparFunciones";

function MovieDetailPage() {
    const { id } = useParams();
    const peliculaId = id ?? "1";

    const [pelicula, setPelicula] = useState<Pelicula | null>(null);
    const [funciones, setFunciones] = useState<Funcion[]>([]);
    const [cines, setCines] = useState<Cine[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [formatoSeleccionado, setFormatoSeleccionado] = useState("Todos");

    useEffect(() => {
        setError(null);

        peliculaService
            .getById(peliculaId)
            .then((data) => setPelicula(data))
            .catch(() => setError("No se pudo cargar la película."));

        cineService.getAll().then((data) => setCines(data));

        funcionService.getByPelicula(peliculaId).then((data) => setFunciones(data));
    }, [peliculaId]);

    if (error) return <p>{error}</p>;
    if (!pelicula) return <p>Cargando película...</p>;

    const formatosDisponibles = funciones.reduce<string[]>(
        (acumulado, funcion) => {
            const yaExiste = acumulado.find((formato) => formato === funcion.formato);
            if (yaExiste) return acumulado;
            return [...acumulado, funcion.formato];
        },
        ["Todos"]
    );

    const funcionesFiltradas =
        formatoSeleccionado === "Todos"
            ? funciones
            : funciones.filter((funcion) => funcion.formato === formatoSeleccionado);

    const grupos = agruparFuncionesPorCine(funcionesFiltradas, cines);

    return (
        <div>
            <h1>{pelicula.titulo}</h1>
            <p>Duración: {pelicula.duracion} minutos</p>
            <p>Género: {pelicula.genero}</p>
            <p>Clasificación: {pelicula.clasificacion}</p>

            <h2>Funciones</h2>

            <label htmlFor="formato">Formato: </label>
            <select
                id="formato"
                value={formatoSeleccionado}
                onChange={(e) => setFormatoSeleccionado(e.target.value)}
            >
                {formatosDisponibles.map((formato) => (
                    <option key={formato} value={formato}>
                        {formato}
                    </option>
                ))}
            </select>

            {grupos.map(({ cine, funciones }) => (
                <div key={cine.id}>
                    <h3>
                        {cine.nombre} - {cine.comuna}
                    </h3>
                    {funciones.map((funcion) => (
                        <p key={funcion.id}>
                            {funcion.horario} - {funcion.formato} - {funcion.idioma} - ${funcion.precio}
                        </p>
                    ))}
                </div>
            ))}
        </div>
    );
}

export default MovieDetailPage;