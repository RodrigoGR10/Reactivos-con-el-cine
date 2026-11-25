import { useId } from "react";
import { PencilIcon, SearchIcon } from "../../components/common/Icons";
import type { TabFavoritos } from "../../hooks/useFavoritosPerfil";

interface ProfileFavoritesHeaderProps {
    tabActiva: TabFavoritos;
    onCambiarTab: (tab: TabFavoritos) => void;
    busqueda: string;
    onBuscar: (texto: string) => void;
    mostrarBuscador: boolean;
    hayGuardadosEnTab: boolean;
    hayUsuario: boolean;
    editando: boolean;
    onToggleEdicion: () => void;
}

/**
 * Controles de pestañas, búsqueda y edición para las listas del perfil.
 * @param props Pestaña activa, valores visibles y callbacks de interacción.
 * @returns Elemento de interfaz que representa el componente con las propiedades recibidas.
 */
export const ProfileFavoritesHeader = ({
    tabActiva,
    onCambiarTab,
    busqueda,
    onBuscar,
    mostrarBuscador,
    hayGuardadosEnTab,
    hayUsuario,
    editando,
    onToggleEdicion,
}: ProfileFavoritesHeaderProps) => {
    const searchInputId = useId();
    const esTabCines = tabActiva === "cines";

    return (
        <section className="middle-nav-row">
            <div className="tabs-group">
                <button
                    type="button"
                    className={`tab-link ${tabActiva === "peliculas" ? "active" : ""}`}
                    aria-pressed={tabActiva === "peliculas"}
                    onClick={() => onCambiarTab("peliculas")}
                >
                    películas guardadas
                </button>
                <button
                    type="button"
                    className={`tab-link ${esTabCines ? "active" : ""}`}
                    aria-pressed={esTabCines}
                    onClick={() => onCambiarTab("cines")}
                >
                    cines habituales
                </button>
            </div>

            <div className="actions-group">
                {mostrarBuscador && (
                    <div className="search-box-minimal">
                        <label
                            htmlFor={searchInputId}
                            className="visualmente-oculto"
                        >
                            {esTabCines ? "Buscar cines" : "Buscar guardados"}
                        </label>
                        <SearchIcon size={16} />
                        <input
                            id={searchInputId}
                            type="search"
                            placeholder={
                                esTabCines
                                    ? "Buscar cines..."
                                    : "Buscar guardados..."
                            }
                            value={busqueda}
                            onChange={(e) => onBuscar(e.target.value)}
                        />
                    </div>
                )}
                {hayUsuario && hayGuardadosEnTab && (
                    <button
                        type="button"
                        className={`btn-edit-minimal ${editando ? "active" : ""}`}
                        onClick={onToggleEdicion}
                        aria-label={
                            editando ? "Finalizar edición" : "Editar guardados"
                        }
                        aria-pressed={editando}
                        title={
                            editando ? "Finalizar edición" : "Editar guardados"
                        }
                    >
                        <span className="btn-edit-text">
                            {editando ? "listo" : "editar"}
                        </span>
                        <PencilIcon size={16} className="btn-edit-icon" />
                    </button>
                )}
            </div>
        </section>
    );
};
