import { useAuth } from "../../context/AuthContext";
import { CalendarIcon } from "../../components/common/Icons";

/** Formatea la fecha de registro dinámicamente en español */
const formatearFechaRegistro = (fechaStr?: string): string => {
    const fecha = fechaStr ? new Date(fechaStr) : new Date();
    const textoFecha = new Intl.DateTimeFormat("es-CL", {
        month: "long",
        year: "numeric",
    }).format(fecha);

    return `se unió en ${textoFecha}`;
};

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
