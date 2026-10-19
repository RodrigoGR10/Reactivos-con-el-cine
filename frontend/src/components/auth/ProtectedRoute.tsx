import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Mensaje } from "../common/Mensaje";

function ProtectedRoute() {
  const { isAuthenticated, isLoadingSession } = useAuth();

  if (isLoadingSession) {
    return <Mensaje texto="Comprobando sesión..." />;
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

export default ProtectedRoute;
