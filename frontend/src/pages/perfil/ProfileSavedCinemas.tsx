import { MapPinIcon, SearchIcon } from "../../components/common/Icons";
import { TarjetaCine } from "../../components/cines/TarjetaCine";
import type { Cine } from "../../types/types";

interface ProfileSavedCinemasProps {
    hayUsuario: boolean;
    cinesFavoritos: Cine[];
    cinesFiltrados: Cine[];
    busqueda: string;
    editando: boolean;
    onQuitarFavorito: (id: string) => void;
}

/**
 * Muestra los cines guardados, resultados y acción para quitarlos del perfil.
 * @param props Favoritos, lista filtrada, búsqueda y acciones de edición.
 * @returns Elemento de interfaz que representa el componente con las propiedades recibidas.
 */
export const ProfileSavedCinemas = ({
    hayUsuario,
    cinesFavoritos,
    cinesFiltrados,
    busqueda,
    editando,
    onQuitarFavorito,
}: ProfileSavedCinemasProps) => (
    <div className="content-area">
        {cinesFavoritos.length === 0 ? (
            <div className="empty-state-ultra">
                <div className="empty-icon-wrap">
                    <MapPinIcon size={36} className="empty-state-svg" />
                </div>
                {hayUsuario ? (
                    <>
                        <h2>no tienes cines guardados</h2>
                        <p>
                            guarda tus complejos frecuentes para consultar
                            horarios de forma directa.
                        </p>
                    </>
                ) : (
                    <p>inicia sesión para guardar tus complejos frecuentes.</p>
                )}
            </div>
        ) : cinesFiltrados.length === 0 ? (
            <div className="empty-state-ultra">
                <div className="empty-icon-wrap">
                    <SearchIcon size={34} className="empty-state-svg" />
                </div>
                <h2>sin resultados para "{busqueda}"</h2>
                <p>
                    no tienes ningún cine habitual que coincida con tu búsqueda.
                </p>
            </div>
        ) : (
            <div className="cines-grid">
                {cinesFiltrados.map((cine) => (
                    <TarjetaCine
                        key={cine.id}
                        cine={cine}
                        nivelTitulo="h2"
                        navegable={!editando}
                        estadoEnlace={{
                            volverA: {
                                to: "/perfil",
                                label: "Volver a mi perfil",
                            },
                        }}
                        accion={
                            editando ? (
                                <button
                                    type="button"
                                    className="btn-cinema-toggle remove"
                                    onClick={() => onQuitarFavorito(cine.id)}
                                    title={`Eliminar ${cine.nombre} de cines habituales`}
                                >
                                    eliminar{" "}
                                    <span className="visualmente-oculto">
                                        {cine.nombre}
                                    </span>
                                    <span aria-hidden="true">✕</span>
                                </button>
                            ) : undefined
                        }
                    />
                ))}
            </div>
        )}
    </div>
);
