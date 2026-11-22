import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthModal } from "../components/auth/AuthModal";
import { Mensaje } from "../components/common/Mensaje";
import { useAuth } from "../context/AuthContext";
import {
    obtenerDestinoLogin,
    obtenerRutaCierreLogin,
} from "../utils/navegacion";

/** Presenta el acceso y devuelve al usuario a la ruta que intentaba abrir. */
function LoginPage() {
    const { isAuthenticated, isLoadingSession } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const destinoPostLogin = obtenerDestinoLogin(location.state) ?? "/perfil";
    const destinoAlCerrar = obtenerRutaCierreLogin(location.state);

    if (isLoadingSession) {
        return <Mensaje tipo="cargando" texto="Comprobando sesión..." />;
    }

    if (isAuthenticated) {
        return <Navigate to={destinoPostLogin} replace />;
    }

    return (
        <AuthModal
            isOpen={true}
            onClose={() => navigate(destinoAlCerrar, { replace: true })}
            onSuccess={() => navigate(destinoPostLogin, { replace: true })}
        />
    );
}

export default LoginPage;
