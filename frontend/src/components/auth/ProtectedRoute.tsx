import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Mensaje } from "../common/Mensaje";

/** Permite mostrar las rutas hijas solo después de confirmar una sesión activa. */
function ProtectedRoute() {
    const { isAuthenticated, isLoadingSession } = useAuth();
    const location = useLocation();

    if (isLoadingSession) {
        return <Mensaje tipo="cargando" texto="Comprobando sesión..." />;
    }

    const returnTo =
        location.state && typeof location.state === "object"
            ? (location.state as { returnTo?: unknown }).returnTo
            : undefined;

    return isAuthenticated ? (
        <Outlet />
    ) : (
        <Navigate to="/login" replace state={{ from: location, returnTo }} />
    );
}

export default ProtectedRoute;
