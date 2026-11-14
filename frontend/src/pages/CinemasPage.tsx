import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import type { Cine } from "../types/types";
import cinesService from "../services/cines";
import { useAuth } from "../context/AuthContext";
import { useFavorites } from "../context/FavoritesContext";
import { FilmIcon, MapPinIcon } from "../components/common/Icons";
import { BotonCercania, ChipsFiltrosActivos } from "../components/common/SelectorMultiple";
import { SelectorComunas } from "../components/cines/SelectorComunas";
import BuscadorPeliculas from "../components/peliculas/BuscadorPeliculas";
import { formatearDistancia } from "../utils/distancia";
import { agruparCines, filtrarCines, obtenerCadena, obtenerComunas, ordenarCinesPorCercania, type CineOrdenado } from "../utils/agruparCines";
import { useUbicacion } from "../hooks/useUbicacion";
import "./CinemasPage.css";

function CinemasPage() {
    const { user, openAuthModal } = useAuth();
    const { favoriteCinemaIds, toggleFavoriteCinema } = useFavorites();
    const { ubicacion, estado, solicitar } = useUbicacion();
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
    const favoritosUsuario = user ? favoriteCinemaIds : [];
    const grupos = agruparCines(cinesFiltrados, favoritosUsuario, ordenarPorCercania ? ubicacion : null);
    const cinesPorCercania = ordenarPorCercania ? ordenarCinesPorCercania(cinesFiltrados, favoritosUsuario, ubicacion) : [];
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
        const logo = cine.logo || obtenerCadena(cine).logo;
        const etiquetaFavorito = cine.favorito ? `Quitar ${cine.nombre} de habituales` : `Guardar ${cine.nombre} como habitual`;
        return (
            <article key={cine.id} className={`cine-card ${cine.favorito ? "cine-card-favorito" : ""}`}>
                <div className="cine-card-header">
                    <div className="cine-logo-container" data-origen={cine.origen}>
                        {logo ? <img src={logo} alt={`Logo de ${cine.nombre}`} className="cine-card-logo" /> : <FilmIcon size={24} />}
                    </div>
                    <button type="button" className={`cine-btn-fav ${cine.favorito ? "active" : ""}`} title={etiquetaFavorito} aria-label={etiquetaFavorito} aria-pressed={cine.favorito} onClick={() => { if (!user) openAuthModal(); else toggleFavoriteCinema(cine.id); }}>
                        <span aria-hidden="true">{cine.favorito ? "♥" : "♡"}</span>
                    </button>
                </div>
                <div className="cine-card-body">
                    <h3 className="cine-card-nombre">{cine.nombre}</h3>
                    <p className="cine-card-comuna"><MapPinIcon size={14} /><span>{cine.comuna}</span>
                        {Number.isFinite(cine.distancia) && <span className="distancia-cine">{formatearDistancia(cine.distancia)}</span>}
                    </p>
                </div>
                <div className="cine-card-footer">
                    <Link to={`/cines/${cine.id}`} className="cine-btn-ver-cartelera">Ver cartelera y funciones<span aria-hidden="true">→</span></Link>
                </div>
            </article>
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
                            tituloActivo="Volver al orden por cadena"
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

            {estado === "denegado" && <p className="aviso-cercania">No pudimos acceder a tu ubicación. Habilita el permiso en tu navegador para ordenar por cercanía.</p>}
            {estado === "error" && <p className="aviso-cercania">No se pudo obtener tu ubicación. Intenta nuevamente.</p>}

            {cargando ? (
                <div className="cines-loading" role="status"><p>Cargando complejos cinematográficos...</p></div>
            ) : error ? (
                <div className="cines-error" role="alert"><p>{error}</p></div>
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
                                    : grupo.logo ? <img src={grupo.logo} alt="" className="cines-cadena-logo" />
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
