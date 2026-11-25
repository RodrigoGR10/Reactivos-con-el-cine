import { useAuth } from "../../context/AuthContext";
import { CalendarIcon } from "../../components/common/Icons";

/**
 * Formatea el mes y año en que se creó la cuenta.
 * @param fechaStr Fecha de registro ISO; si falta, usa la fecha actual.
 * @returns Texto localizado, por ejemplo `se unió en mayo de 2026`.
 */
const formatearFechaRegistro = (fechaStr?: string): string => {
    const fecha = fechaStr ? new Date(fechaStr) : new Date();
    const textoFecha = new Intl.DateTimeFormat("es-CL", {
        month: "long",
        year: "numeric",
    }).format(fecha);

    return `se unió en ${textoFecha}`;
};

/** Muestra identidad de usuario y la acción de autenticación del perfil.
 * @returns Elemento de interfaz que representa el componente con las propiedades recibidas.
 */
export const ProfileHeader = () => {
    const { user, openAuthModal } = useAuth();

    return (
        <section className="profile-header">
            <div className="profile-header-left">
                <div className="profile-avatar-lg">
                    <img
                        src={user ? "/default-avatar.png" : "/guest-avatar.png"}
                        alt={user ? user.nombre : "mi perfil"}
                        className="avatar-img"
                    />
                </div>
                <div className="profile-user-info">
                    <h1 className="profile-user-name">
                        {user ? user.nombre : "mi perfil"}
                    </h1>
                    {user ? (
                        <p className="profile-user-joined">
                            <CalendarIcon
                                size={14}
                                className="calendar-icon-inline"
                            />
                            <span>
                                {formatearFechaRegistro(user.fechaRegistro)}
                            </span>
                        </p>
                    ) : (
                        <button
                            type="button"
                            className="btn-guest-login"
                            onClick={() => openAuthModal()}
                        >
                            iniciar sesión
                        </button>
                    )}
                </div>
            </div>
        </section>
    );
};
