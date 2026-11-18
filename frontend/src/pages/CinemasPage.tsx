import { useState, useEffect } from "react";
import { Skeleton } from "@mantine/core";
import type { Cine } from "../types/types";
import cinesService from "../services/cines";
import { useAuth } from "../context/AuthContext";
import { useFavorites } from "../context/FavoritesContext";
import { useFavoritosAlEntrar } from "../hooks/useFavoritosAlEntrar";
import { FilmIcon } from "../components/common/Icons";
import { BotonFavorito } from "../components/common/BotonFavorito";
import { AvisoUbicacion, Mensaje } from "../components/common/Mensaje";
import { BotonCercania, ChipsFiltrosActivos } from "../components/common/SelectorMultiple";
import { SelectorComunas } from "../components/cines/SelectorComunas";
import { TarjetaCine, TarjetaCineSkeleton } from "../components/cines/TarjetaCine";
import BuscadorPeliculas from "../components/peliculas/BuscadorPeliculas";
import { agruparCines, filtrarCines, obtenerComunas, ordenarCinesPorCercania, type CineOrdenado } from "../utils/agruparCines";
import { useUbicacion } from "../hooks/useUbicacion";
import "./CinemasPage.css";

const GRUPOS_ESQUELETO = [0, 1];
const TARJETAS_ESQUELETO = [0, 1, 2, 3];

function CinemasPage() {
    const { user, openAuthModal } = useAuth();
    const { isFavoriteCinema, toggleFavoriteCinema } = useFavorites();
    const { cinesFavoritosAlEntrar } = useFavoritosAlEntrar();
    const { ubicacion, estado, solicitar, descartarAviso } = useUbicacion();
    const [cercaniaActiva, setCercaniaActiva] = useState(true);
    const [cines, setCines] = useState<Cine[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busqueda, setBusqueda] = useState("");
    const [comunasSeleccionadas, setComunasSeleccionadas] = useState<string[]>([]);

    useEffect(() => {
        let activo = true;
        cinesService.getAll()
            .then((data) => { if (activo) setCines(data); })
            .catch(() => { if (activo) setError("No se pudieron cargar los cines. Intenta nuevamente."); })
            .finally(() => { if (activo) setCargando(false); });
        return () => { activo = false; };
    }, []);

    const comunas = obtenerComunas(cines);
    const cinesFiltrados = filtrarCines(cines, busqueda, comunasSeleccionadas);
    const ordenarPorCercania = cercaniaActiva && estado === "listo" && ubicacion !== null;
    const favoritosOrden = user ? [...cinesFavoritosAlEntrar] : [];
    const grupos = agruparCines(cinesFiltrados, favoritosOrden, ordenarPorCercania ? ubicacion : null);
    const cinesPorCercania = ordenarPorCercania ? ordenarCinesPorCercania(cinesFiltrados, favoritosOrden, ubicacion) : [];
    const limpiarFiltros = () => {
        setBusqueda("");
        setComunasSeleccionadas([]);
    };
    const chipsComunas = comunas
        .filter((comuna) => comunasSeleccionadas.includes(comuna.valor))
        .map((comuna) => ({
            id: `comuna-${comuna.valor}`,
            etiqueta: comuna.nombre,
            ariaLabel: `Quitar filtro ${comuna.nombre}`,
            onQuitar: () =>
                setComunasSeleccionadas((anteriores) =>
                    anteriores.filter((valor) => valor !== comuna.valor),
                ),
        }));

    const renderTarjetaCine = (cine: CineOrdenado) => {
        const esFavorito = Boolean(user && isFavoriteCinema(cine.id));
        const etiquetaFavorito = esFavorito ? `Quitar ${cine.nombre} de habituales` : `Guardar ${cine.nombre} como habitual`;
        return (
            <TarjetaCine
                key={cine.id}
                cine={cine}
                distancia={cine.distancia}
                accion={
                    <BotonFavorito
                        className="cine-card-fav"
                        activo={esFavorito}
                        ariaLabel={etiquetaFavorito}
                        title={etiquetaFavorito}
                        onClick={() => {
                            if (!user) openAuthModal();
                            else toggleFavoriteCinema(cine.id);
                        }}
                    />
                }
            />
        );
    };

    return (
        <div className="cines-page">
            <header className="cines-header">
                <div className="cines-header-title">
                    <p className="cines-subtitulo">Directorio de salas</p>
                    <h1>Cines y complejos</h1>
                </div>
                {!cargando && !error && (
                    <span className="cines-contador" role="status">
                        <strong>{cinesFiltrados.length}</strong> {cinesFiltrados.length === 1 ? "cine" : "cines"}
                    </span>
                )}
            </header>

            <section className="cines-filtros" aria-label="Búsqueda y filtros de cines">
                <div className="herramientas-cartelera">
                    <BuscadorPeliculas
                        busqueda={busqueda}
                        onBusquedaChange={setBusqueda}
                        label="Buscar cine o comuna"
                        placeholder="Buscar por cine o comuna..."
                    />
                    <div className="filtros-cartelera-selectores">
                        <SelectorComunas opciones={comunas} seleccionadas={comunasSeleccionadas} onChange={setComunasSeleccionadas} />
                        <BotonCercania
                            activo={ordenarPorCercania}
                            cargando={estado === "cargando"}
                            tituloInactivo="Ordenar por cercanía"
                            onToggle={() => {
                                if (ordenarPorCercania) {
                                    setCercaniaActiva(false);
                                    return;
                                }
                                setCercaniaActiva(true);
                                solicitar();
                            }}
                        />
                    </div>
                </div>
                <ChipsFiltrosActivos chips={chipsComunas} ariaLabel="Comunas seleccionadas" />
            </section>

            <AvisoUbicacion
                estado={estado}
                onCerrar={descartarAviso}
                className="cines-aviso-ubicacion"
            />

            {cargando ? (
                <div className="cines-grupos" role="status" aria-busy="true">
                    <span className="visualmente-oculto">
                        Cargando complejos cinematográficos...
                    </span>
                    {GRUPOS_ESQUELETO.map((grupoIdx) => (
                        <div key={grupoIdx} className="cines-cadena" aria-hidden="true">
                            <div className="cines-cadena-header">
                                <Skeleton width={30} height={30} radius={5} />
                                <Skeleton
                                    width={grupoIdx === 0 ? 120 : 145}
                                    height={18}
                                    radius="sm"
                                />
                                <Skeleton width={56} height={14} radius="sm" ml="auto" />
                            </div>
                            <div className="cines-grid">
                                {TARJETAS_ESQUELETO.map((cardIdx) => (
                                    <TarjetaCineSkeleton key={cardIdx} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : error ? (
                <Mensaje
                    tipo="error"
                    embebido
                    titulo="Error al cargar los cines"
                    texto={error}
                />
            ) : cinesFiltrados.length === 0 ? (
                <div className="cines-empty">
                    <FilmIcon size={32} />
                    <h2>No se encontraron cines</h2>
                    <p>No hay cines que coincidan con los filtros seleccionados.</p>
                    <button type="button" className="cines-btn-limpiar-empty" onClick={limpiarFiltros}>Restablecer búsqueda</button>
                </div>
            ) : ordenarPorCercania ? (
                <div className="cines-grid">
                    {cinesPorCercania.map(renderTarjetaCine)}
                </div>
            ) : (
                <div className="cines-grupos">
                    {grupos.map((grupo) => (
                        <section key={grupo.id} className={`cines-cadena ${grupo.id === "favoritos" ? "cines-cadena-favoritos" : ""}`} aria-labelledby={`cadena-${grupo.id}`}>
                            <header className="cines-cadena-header">
                                {grupo.id === "favoritos" ? <span className="cines-cadena-favorito-icon" aria-hidden="true">♥</span>
                                    : grupo.logo ? <img src={grupo.logo} alt="" className="cines-cadena-logo" data-origen={grupo.id} />
                                    : <FilmIcon size={24} />}
                                <h2 id={`cadena-${grupo.id}`}>{grupo.nombre}</h2>
                                <span className="cines-cadena-cantidad">{grupo.cines.length} {grupo.cines.length === 1 ? "cine" : "cines"}</span>
                            </header>
                            <div className="cines-grid">
                                {grupo.cines.map(renderTarjetaCine)}
                            </div>
                        </section>
                    ))}
                </div>
            )}
        </div>
    );
}

export default CinemasPage;
