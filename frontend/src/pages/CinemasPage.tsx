import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import type { Cine } from "../types/types";
import cinesService from "../services/cines";
import { useAuth } from "../context/AuthContext";
import { useFavorites } from "../context/FavoritesContext";
import { CloseIcon, FilmIcon, SearchIcon, MapPinIcon } from "../components/common/Icons";
import { SelectorComunas } from "../components/cines/SelectorComunas";
import { formatearDistancia } from "../utils/distancia";
import { agruparCines, filtrarCines, obtenerCadena, obtenerComunas } from "../utils/agruparCines";
import { useUbicacion } from "../hooks/useUbicacion";
import "./CinemasPage.css";

function CinemasPage() {
    const { user, openAuthModal } = useAuth();
    const { favoriteCinemaIds, toggleFavoriteCinema } = useFavorites();
    const { ubicacion, estado, solicitar } = useUbicacion();
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
    const grupos = agruparCines(cinesFiltrados, user ? favoriteCinemaIds : [], ubicacion);
    const hayFiltrosActivos = busqueda.trim() !== "" || comunasSeleccionadas.length > 0;
    const limpiarFiltros = () => {
        setBusqueda("");
        setComunasSeleccionadas([]);
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
                <div className="cines-filtros-bar">
                    <div className="cines-search-box">
                        <SearchIcon size={18} />
                        <input type="text" aria-label="Buscar cine o comuna" placeholder="Buscar por cine o comuna..." value={busqueda} onChange={(event) => setBusqueda(event.target.value)} />
                        {busqueda && (
                            <button type="button" className="cines-icon-button" onClick={() => setBusqueda("")} aria-label="Borrar búsqueda de cines" title="Borrar búsqueda">
                                <CloseIcon size={16} />
                            </button>
                        )}
                    </div>
                    <SelectorComunas opciones={comunas} seleccionadas={comunasSeleccionadas} onChange={setComunasSeleccionadas} />
                    <button type="button" className={`boton-cercania-cine ${estado === "listo" ? "activo" : ""}`} onClick={solicitar} disabled={estado === "cargando" || estado === "listo"}>
                        <MapPinIcon size={17} />
                        <span>{estado === "cargando" ? "Ubicando..." : "Cerca de mí"}</span>
                    </button>
                    <button type="button" className="cines-icon-button cines-limpiar-filtros" disabled={!hayFiltrosActivos} onClick={limpiarFiltros} aria-label="Limpiar filtros de cines" title="Limpiar filtros">
                        <CloseIcon size={18} />
                    </button>
                </div>
                {comunasSeleccionadas.length > 0 && (
                    <div className="cines-comunas-seleccionadas" aria-label="Comunas seleccionadas">
                        {comunas.filter((comuna) => comunasSeleccionadas.includes(comuna.valor)).map((comuna) => (
                            <button key={comuna.valor} type="button" className="cines-comuna-chip" onClick={() => setComunasSeleccionadas((anteriores) => anteriores.filter((valor) => valor !== comuna.valor))} aria-label={`Quitar filtro ${comuna.nombre}`}>
                                {comuna.nombre}<CloseIcon size={13} />
                            </button>
                        ))}
                    </div>
                )}
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
                                {grupo.cines.map((cine) => {
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
                                })}
                            </div>
                        </section>
                    ))}
                </div>
            )}
        </div>
    );
}

export default CinemasPage;
