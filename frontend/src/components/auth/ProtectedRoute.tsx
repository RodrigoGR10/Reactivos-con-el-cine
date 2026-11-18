import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { Mensaje } from "../common/Mensaje";

function ProtectedRoute() {
  const isAuthenticated = useAuthStore((state) => state.user !== null);
  const isLoadingSession = useAuthStore((state) => state.isLoadingSession);

  if (isLoadingSession) {
    return <Mensaje texto="Comprobando sesión..." />;
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

export default ProtectedRoute;
