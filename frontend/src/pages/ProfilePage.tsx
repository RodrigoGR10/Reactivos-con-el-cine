import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';
import type { Pelicula, Cine } from '../types/types';
import { SearchIcon, FilmIcon, MapPinIcon, CalendarIcon } from '../components/common/Icons';
import peliculasService from '../services/peliculas';
import cinesService from '../services/cines';
import './ProfilePage.css';



/** Resuelve logo de cine: usa el provisto o infiere por nombre conocido */
const getCinemaLogo = (cine: Cine): string => {
    if (cine.logo) return cine.logo;
    const nameLower = cine.nombre.toLowerCase();
    if (nameLower.includes('cinemark')) return '/cinemark.png';
    if (nameLower.includes('cinepolis') || nameLower.includes('cinépolis')) return '/cinepolis.png';
    if (nameLower.includes('cineplanet')) return '/cineplanet.png';
    return '';
};

type TabType = 'peliculas' | 'cines';

const ProfilePage = () => {
    const { user, openAuthModal } = useAuth();
    const {
        favoriteMovieIds,
        favoriteCinemaIds,
        toggleFavoriteMovie,
        toggleFavoriteCinema
    } = useFavorites();

    const [tabActiva, setTabActiva] = useState<TabType>('peliculas');
    const [busqueda, setBusqueda] = useState('');
    const [modoEdicion, setModoEdicion] = useState(false);
    const [peliculas, setPeliculas] = useState<Pelicula[]>([]);
    const [cines, setCines] = useState<Cine[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Consulta la API mediante servicios en paralelo con Promise.all
    useEffect(() => {
        Promise.all([
            peliculasService.getAll(),
            cinesService.getAll()
        ])
            .then(([peliculasData, cinesData]) => {
                setPeliculas(peliculasData);
                setCines(cinesData);
            })
            .catch(() => {
                setError('No se pudieron cargar los datos del catálogo.');
            })
            .finally(() => {
                setCargando(false);
            });
    }, []);

    const peliculasFavoritas = peliculas.filter((p) => favoriteMovieIds.includes(Number(p.id)));
    const cinesFavoritos = cines.filter((c) => favoriteCinemaIds.includes(Number(c.id)));

    // Buscador solo aparece si hay >14 items (evita UI innecesaria en listas cortas)
    const mostrarBuscador = tabActiva === 'peliculas'
        ? peliculasFavoritas.length > 14
        : cinesFavoritos.length > 14;

    const query = mostrarBuscador ? busqueda.trim().toLowerCase() : '';

    const peliculasGuardadasFiltradas = query
        ? peliculasFavoritas.filter((p) => p.titulo.toLowerCase().includes(query))
        : peliculasFavoritas;

    const cinesGuardadosFiltrados = query
        ? cinesFavoritos.filter((c) =>
            c.nombre.toLowerCase().includes(query) ||
            c.comuna.toLowerCase().includes(query)
        )
        : cinesFavoritos;

    return (
        <>
            <div className="main-content">
                <section className="profile-header">
                    <div className="profile-header-left">
                        <div className="profile-avatar-lg">
                            <img
                                src={user ? '/default-avatar.png?v=3' : '/guest-avatar.png'}
                                alt={user ? user.nombre : 'mi perfil'}
                                className="avatar-img"
                            />
                        </div>
                        <div className="profile-user-info">
                            <h1 className="profile-user-name">{user ? user.nombre : 'mi perfil'}</h1>
                            {user ? (
                                <p className="profile-user-joined">
                                    <CalendarIcon size={14} className="calendar-icon-inline" />
                                    <span>se unió en septiembre de 2026</span>
                                </p>
                            ) : (
                                <button
                                    type="button"
                                    className="btn-guest-login"
                                    onClick={openAuthModal}
                                >
                                    iniciar sesión
                                </button>
                            )}
                        </div>
                    </div>
                </section>

                <section className="middle-nav-row">
                    <div className="tabs-group">
                        <button
                            type="button"
                            className={`tab-link ${tabActiva === 'peliculas' ? 'active' : ''}`}
                            onClick={() => {
                                setTabActiva('peliculas');
                                setBusqueda('');
                            }}
                        >
                            películas guardadas ({cargando ? '...' : peliculasFavoritas.length})
                        </button>
                        <button
                            type="button"
                            className={`tab-link ${tabActiva === 'cines' ? 'active' : ''}`}
                            onClick={() => {
                                setTabActiva('cines');
                                setBusqueda('');
                            }}
                        >
                            cines habituales ({cargando ? '...' : cinesFavoritos.length})
                        </button>
                    </div>

                    <div className="actions-group">
                        {mostrarBuscador && (
                            <div className="search-box-minimal">
                                <SearchIcon size={16} />
                                <input
                                    type="text"
                                    placeholder={tabActiva === 'cines' ? 'buscar cines' : 'buscar guardados'}
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                />
                            </div>
                        )}
                        {user && (tabActiva === 'peliculas' ? peliculasFavoritas.length > 0 : cinesFavoritos.length > 0) && (
                            <button
                                type="button"
                                className={`btn-edit-minimal ${modoEdicion ? 'active' : ''}`}
                                onClick={() => setModoEdicion((prev) => !prev)}
                                title={modoEdicion ? 'Finalizar edición' : 'Editar guardados'}
                            >
                                {modoEdicion ? 'listo' : 'editar'}
                            </button>
                        )}
                    </div>
                </section>

                {cargando ? (
                    <div className="content-area">
                        <div className="empty-state-ultra">
                            <p>Cargando favoritos...</p>
                        </div>
                    </div>
                ) : error ? (
                    <div className="content-area">
                        <div className="empty-state-ultra">
                            <p>{error}</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {tabActiva === 'peliculas' && (
                    <div className="content-area">
                        {peliculasFavoritas.length === 0 ? (
                            <div className="empty-state-ultra">
                                <div className="empty-icon-wrap">
                                    <FilmIcon size={36} />
                                </div>
                                {user ? (
                                    <>
                                        <h3>tu lista de películas está vacía</h3>
                                        <p>guarda películas desde la cartelera para tenerlas a mano al ir al cine.</p>
                                    </>
                                ) : (
                                    <p>inicia sesión para ver o guardar tus películas favoritas.</p>
                                )}
                            </div>
                        ) : peliculasGuardadasFiltradas.length === 0 ? (
                            <div className="empty-state-ultra">
                                <div className="empty-icon-wrap">
                                    <SearchIcon size={34} className="empty-state-svg" />
                                </div>
                                <h3>sin resultados para "{busqueda}"</h3>
                                <p>no tienes ninguna película guardada que coincida con tu búsqueda.</p>
                            </div>
                        ) : (
                            <div className="posters-grid">
                                {peliculasGuardadasFiltradas.map((peli) => (
                                    <article
                                        key={peli.id}
                                        className={`poster-card ${modoEdicion ? 'editing' : ''}`}
                                        title={peli.titulo}
                                    >
                                        <img
                                            src={peli.poster}
                                            alt={peli.titulo}
                                            className="poster-img"
                                            loading="lazy"
                                        />
                                        {modoEdicion && (
                                            <div className="poster-edit-overlay">
                                                <button
                                                    type="button"
                                                    className="btn-poster-remove"
                                                    onClick={() => toggleFavoriteMovie(Number(peli.id))}
                                                    title={`Eliminar ${peli.titulo} de mis películas`}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        )}
                                    </article>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {tabActiva === 'cines' && (
                    <div className="content-area">
                        {cinesFavoritos.length === 0 ? (
                            <div className="empty-state-ultra">
                                <div className="empty-icon-wrap">
                                    <MapPinIcon size={36} className="empty-state-svg" />
                                </div>
                                {user ? (
                                    <>
                                        <h3>no tienes cines guardados</h3>
                                        <p>guarda tus complejos frecuentes para consultar horarios de forma directa.</p>
                                    </>
                                ) : (
                                    <p>inicia sesión para guardar tus complejos frecuentes.</p>
                                )}
                            </div>
                        ) : cinesGuardadosFiltrados.length === 0 ? (
                            <div className="empty-state-ultra">
                                <div className="empty-icon-wrap">
                                    <SearchIcon size={34} className="empty-state-svg" />
                                </div>
                                <h3>sin resultados para "{busqueda}"</h3>
                                <p>no tienes ningún cine habitual que coincida con tu búsqueda.</p>
                            </div>
                        ) : (
                            <div className="cinemas-grid-ultra">
                                {cinesGuardadosFiltrados.map((cine) => (
                                    <div key={cine.id} className="cinema-card-ultra">
                                        <div className="cinema-card-left">
                                            <div className="cinema-logo-box">
                                                {getCinemaLogo(cine) ? (
                                                    <img
                                                        src={getCinemaLogo(cine)}
                                                        alt={cine.nombre}
                                                        className="cinema-logo-img"
                                                        loading="lazy"
                                                    />
                                                ) : (
                                                    <MapPinIcon size={20} className="inline-pin-svg" />
                                                )}
                                            </div>
                                            <div className="cinema-meta">
                                                <h4>{cine.nombre}</h4>
                                                <p className="cinema-location">
                                                    <MapPinIcon size={13} className="inline-pin-svg" />
                                                    <span>{cine.comuna}</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="cinema-card-right">
                                            {modoEdicion ? (
                                                <button
                                                    type="button"
                                                    className="btn-cinema-toggle remove"
                                                    onClick={() => toggleFavoriteCinema(Number(cine.id))}
                                                    title="eliminar de cines habituales"
                                                >
                                                    eliminar ✕
                                                </button>
                                            ) : (
                                                <span className="cinema-badge-habitual">habitual ✓</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                    </>
                )}
            </div>
        </>
    );
};

export default ProfilePage;
