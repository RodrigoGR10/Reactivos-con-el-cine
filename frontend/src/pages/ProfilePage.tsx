import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';
import type { Pelicula, Cine } from '../types/types';
import { SearchIcon, FilmIcon, MapPinIcon, HomeIcon, UserIcon, LogOutIcon, LogInIcon, CalendarIcon } from '../components/common/Icons';
import { AuthModal } from '../components/auth/AuthModal';
import './ProfilePage.css';

// Catálogo base con las 5 películas en cartelera y pósters oficiales
const PELICULAS_BASE: Pelicula[] = [
    {
        id: 1,
        titulo: 'Resident Evil',
        duracion: 93,
        sinopsis: 'Película basada en la saga de videojuegos de Capcom del mismo nombre. En una reinvención totalmente nueva, el mensajero médico Bryan se ve inmerso en una carrera de acción sin descanso por la supervivencia, mientras el caos se desata a su alrededor.',
        poster: 'https://image.tmdb.org/t/p/w440_and_h660_face/ntmaNFJ7O60n45E1E6HZlXeSV5e.jpg'
    },
    {
        id: 2,
        titulo: 'Dune: Part Three',
        duracion: 140,
        sinopsis: 'Paul Atreides, ahora Emperador Muad\'Dib, se desenvuelve en su inmenso poder mientras lucha contra enemigos políticos y una conspiración dentro de su círculo. Mientras la Casa Atreides se enfrenta al colapso, surge el verdadero peligro para la amante de Paul, Chani, y su heredero nonato.',
        poster: 'https://image.tmdb.org/t/p/w440_and_h660_face/uj4EuGmFNAc4CHBVEtRZ04MXzka.jpg'
    },
    {
        id: 3,
        titulo: 'Coyote vs. Acme',
        duracion: 103,
        sinopsis: 'Después de que todos los productos fabricados por ACME Corporation le salgan mal a Wile E. Coyote, en su persecución del Correcaminos, contrata a un abogado humano igualmente desafortunado para demandar a la empresa. Cuando el abogado de Wile E. descubre que el intimidante jefe de su antiguo bufete es el director general de ACME, se une a Wile E. para ganar el juicio contra él.',
        poster: 'https://image.tmdb.org/t/p/w440_and_h660_face/sv6gFggwOOOAMRZssdkNwEIMzCa.jpg'
    },
    {
        id: 4,
        titulo: 'La Odisea',
        duracion: 173,
        sinopsis: 'Tras la caída de Troya, el legendario rey de Ítaca, Odiseo a.k.a. Ulises, emprende un largo y peligroso viaje para regresar junto a su esposa Penélope y su hijo Telémaco. En el camino deberá enfrentarse a criaturas mitológicas, dioses caprichosos y pruebas que pondrán a prueba su ingenio, su resistencia y su humanidad. Mientras tanto, en Ítaca, el futuro de su reino pende de un hilo ante la creciente amenaza de quienes creen que jamás volverá.',
        poster: 'https://image.tmdb.org/t/p/w440_and_h660_face/sf2ke1nwFOLLcwLZiXu9VaMMv8e.jpg'
    },
    {
        id: 5,
        titulo: 'Minions & Monsters',
        duracion: 90,
        sinopsis: 'Narra la historia de cómo los minions conquistaron la industria de Hollywood, se convirtieron en estrellas de cine, lo perdieron todo, desataron monstruos en el mundo y luego se unieron para intentar salvar al planeta del caos que acababan de crear.',
        poster: 'https://image.tmdb.org/t/p/w440_and_h660_face/euBGhMiViiIrVyAuA8seORR0QWH.jpg'
    }
];

const CINES_BASE: Cine[] = [
    { id: 1, nombre: 'Cinemark', comuna: 'Maipú', logo: '/cinemark.png' },
    { id: 2, nombre: 'Cinépolis', comuna: 'La Reina', logo: '/cinepolis.png' },
    { id: 3, nombre: 'Cineplanet', comuna: 'Santiago', logo: '/cineplanet.png' }
];

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
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const {
        favoriteMovieIds,
        favoriteCinemaIds,
        toggleFavoriteMovie,
        toggleFavoriteCinema
    } = useFavorites();

    const [tabActiva, setTabActiva] = useState<TabType>('peliculas');
    const [busqueda, setBusqueda] = useState('');
    const [modoEdicion, setModoEdicion] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [peliculas, setPeliculas] = useState<Pelicula[]>(PELICULAS_BASE);
    const [cines, setCines] = useState<Cine[]>(CINES_BASE);

    // Consulta la API local si el backend está activo; si no, mantiene los datos base
    useEffect(() => {
        fetch('http://localhost:3001/peliculas')
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (Array.isArray(data) && data.length > 0) {
                    setPeliculas(data);
                }
            })
            .catch(() => {
                // Modo offline: mantiene PELICULAS_BASE
            });

        fetch('http://localhost:3001/cines')
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (Array.isArray(data) && data.length > 0) {
                    setCines(data);
                }
            })
            .catch(() => {
                // Modo offline: mantiene CINES_BASE
            });
    }, []);

    // Películas y cines favoritos del usuario
    const peliculasFavoritas = peliculas.filter((p) => favoriteMovieIds.includes(p.id));
    const cinesFavoritos = cines.filter((c) => favoriteCinemaIds.includes(c.id));

    // El buscador solo debe aparecer cuando tengamos +14 elementos
    const mostrarBuscador = tabActiva === 'peliculas'
        ? peliculasFavoritas.length > 14
        : cinesFavoritos.length > 14;

    const query = mostrarBuscador ? busqueda.trim().toLowerCase() : '';

    // Búsqueda exclusivamente dentro de los elementos guardados por el usuario
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
        <div className="layout-root">
            {/* 1. Sidebar Izquierdo Minimalista Fijo */}
            <aside className="sidebar">
                <div className="sidebar-top">
                    <button type="button" className="sidebar-btn logo-btn" title="Reactivos con el Cine" onClick={() => navigate('/')}>
                        <img src="/logo.jpg" alt="Reactivos con el Cine" className="sidebar-logo-img" />
                    </button>
                </div>

                <div className="sidebar-mid">
                    <button type="button" className="sidebar-btn" title="Inicio" onClick={() => navigate('/')}>
                        <HomeIcon size={28} />
                    </button>
                    <button type="button" className="sidebar-btn active" title="Perfil" onClick={() => navigate('/perfil')}>
                        <UserIcon size={28} />
                    </button>
                </div>

                <div className="sidebar-bottom">
                    {user ? (
                        <button
                            type="button"
                            className="sidebar-btn"
                            title="Cerrar Sesión"
                            onClick={() => logout()}
                        >
                            <LogOutIcon size={26} />
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="sidebar-btn"
                            title="Iniciar Sesión"
                            onClick={() => setIsAuthModalOpen(true)}
                        >
                            <LogInIcon size={26} />
                        </button>
                    )}
                </div>
            </aside>

            {/* 2. Contenedor Principal */}
            <main className="main-content">
                {/* 3. Sección Superior (Header de Perfil Minimalista) */}
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
                                    onClick={() => setIsAuthModalOpen(true)}
                                >
                                    iniciar sesión
                                </button>
                            )}
                        </div>
                    </div>
                </section>

                {/* 4. Navegación y Filtros (Middle Section) */}
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
                            películas guardadas ({peliculasFavoritas.length})
                        </button>
                        <button
                            type="button"
                            className={`tab-link ${tabActiva === 'cines' ? 'active' : ''}`}
                            onClick={() => {
                                setTabActiva('cines');
                                setBusqueda('');
                            }}
                        >
                            cines habituales ({cinesFavoritos.length})
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

                {/* 5. Contenido Principal */}
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
                                            onError={(e) => {
                                                e.currentTarget.style.opacity = '0';
                                            }}
                                        />
                                        {modoEdicion && (
                                            <div className="poster-edit-overlay">
                                                <button
                                                    type="button"
                                                    className="btn-poster-remove"
                                                    onClick={() => toggleFavoriteMovie(peli.id)}
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

                {/* Pestaña: Cines Habituales */}
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
                                                    onClick={() => toggleFavoriteCinema(cine.id)}
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
            </main>

            {/* Modal emergente de Autenticación con Glassmorphism */}
            {isAuthModalOpen && (
                <AuthModal
                    isOpen={isAuthModalOpen}
                    onClose={() => setIsAuthModalOpen(false)}
                />
            )}
        </div>
    );
};

export default ProfilePage;
