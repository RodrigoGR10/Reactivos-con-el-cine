import { useEffect, useState } from "react";
import { useFavorites } from "../context/FavoritesContext";
import type { Pelicula, Cine } from "../types/types";
import peliculasService from "../services/peliculas";
import cinesService from "../services/cines";
import { normalizarTexto } from "../utils/normalizarTexto";

export type TabFavoritos = "peliculas" | "cines";

/** Cantidad mínima de guardados para que el buscador aporte valor. */
const MINIMO_PARA_BUSCAR = 14;

/**
 * Carga el catálogo necesario para resolver los favoritos y deriva las listas
 * visibles según la pestaña activa y el texto de búsqueda.
 */
export const useFavoritosPerfil = (tabActiva: TabFavoritos) => {
    const { favoriteMovieIds, favoriteCinemaIds } = useFavorites();

    const [peliculas, setPeliculas] = useState<Pelicula[]>([]);
    const [cines, setCines] = useState<Cine[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busqueda, setBusqueda] = useState("");

    // Consulta la API mediante servicios en paralelo con Promise.all
    useEffect(() => {
        let activo = true;
        Promise.all([peliculasService.getAll(), cinesService.getAll()])
            .then(([peliculasData, cinesData]) => {
                if (!activo) return;
                setPeliculas(peliculasData);
                setCines(cinesData);
            })
            .catch(() => {
                if (activo) setError("No se pudieron cargar los datos del catálogo.");
            })
            .finally(() => {
                if (activo) setCargando(false);
            });
        return () => {
            activo = false;
        };
    }, []);

    const peliculasFavoritas = peliculas.filter((p) =>
        favoriteMovieIds.includes(p.id),
    );
    const cinesFavoritos = cines.filter((c) => favoriteCinemaIds.includes(c.id));

    const hayGuardadosEnTab =
        tabActiva === "peliculas"
            ? peliculasFavoritas.length > 0
            : cinesFavoritos.length > 0;

    const mostrarBuscador =
        tabActiva === "peliculas"
            ? peliculasFavoritas.length > MINIMO_PARA_BUSCAR
            : cinesFavoritos.length > MINIMO_PARA_BUSCAR;

    const query = mostrarBuscador ? normalizarTexto(busqueda.trim()) : "";

    const peliculasFiltradas = query
        ? peliculasFavoritas.filter((p) =>
              normalizarTexto(p.titulo).includes(query),
          )
        : peliculasFavoritas;

    const cinesFiltrados = query
        ? cinesFavoritos.filter(
              (c) =>
                  normalizarTexto(c.nombre).includes(query) ||
                  normalizarTexto(c.comuna).includes(query),
          )
        : cinesFavoritos;

    return {
        cargando,
        error,
        busqueda,
        setBusqueda,
        peliculasFavoritas,
        cinesFavoritos,
        peliculasFiltradas,
        cinesFiltrados,
        hayGuardadosEnTab,
        mostrarBuscador,
    };
};
