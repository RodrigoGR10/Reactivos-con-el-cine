import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useFavorites } from "../context/FavoritesContext";
import { Mensaje } from "../components/common/Mensaje";
import {
    useFavoritosPerfil,
    type TabFavoritos,
} from "../hooks/useFavoritosPerfil";
import { ProfileHeader } from "./perfil/ProfileHeader";
import { ProfileFavoritesHeader } from "./perfil/ProfileFavoritesHeader";
import { ProfileFavoritesSkeleton } from "./perfil/ProfileFavoritesSkeleton";
import { ProfileSavedMovies } from "./perfil/ProfileSavedMovies";
import { ProfileSavedCinemas } from "./perfil/ProfileSavedCinemas";
import "./ProfilePage.css";

const ProfilePage = () => {
    const { user } = useAuth();
    const { toggleFavoriteMovie, toggleFavoriteCinema } = useFavorites();

    const [tabActiva, setTabActiva] = useState<TabFavoritos>("peliculas");
    const [modoEdicion, setModoEdicion] = useState(false);

    const {
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
    } = useFavoritosPerfil(tabActiva);

    const editando = modoEdicion && hayGuardadosEnTab;

    const cambiarTab = (tab: TabFavoritos) => {
        setTabActiva(tab);
        setBusqueda("");
        setModoEdicion(false);
    };

    return (
        <div className="main-content">
            <ProfileHeader />

            <ProfileFavoritesHeader
                tabActiva={tabActiva}
                onCambiarTab={cambiarTab}
                busqueda={busqueda}
                onBuscar={setBusqueda}
                mostrarBuscador={mostrarBuscador}
                hayGuardadosEnTab={hayGuardadosEnTab}
                hayUsuario={Boolean(user)}
                editando={editando}
                onToggleEdicion={() => setModoEdicion((prev) => !prev)}
            />

            {cargando ? (
                <ProfileFavoritesSkeleton tabActiva={tabActiva} />
            ) : error ? (
                <div className="content-area">
                    <Mensaje
                        tipo="error"
                        embebido
                        titulo="Error al cargar favoritos"
                        texto={error}
                    />
                </div>
            ) : tabActiva === "peliculas" ? (
                <ProfileSavedMovies
                    hayUsuario={Boolean(user)}
                    peliculasFavoritas={peliculasFavoritas}
                    peliculasFiltradas={peliculasFiltradas}
                    busqueda={busqueda}
                    editando={editando}
                    onQuitarFavorito={toggleFavoriteMovie}
                />
            ) : (
                <ProfileSavedCinemas
                    hayUsuario={Boolean(user)}
                    cinesFavoritos={cinesFavoritos}
                    cinesFiltrados={cinesFiltrados}
                    busqueda={busqueda}
                    editando={editando}
                    onQuitarFavorito={toggleFavoriteCinema}
                />
            )}
        </div>
    );
};

export default ProfilePage;
