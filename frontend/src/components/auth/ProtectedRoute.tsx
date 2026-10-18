import { useEffect } from "react";
import { Navigate, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Mensaje } from "../common/Mensaje";

function ProtectedRoute() {
  const { isAuthenticated, isLoadingSession, openAuthModal } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoadingSession && !isAuthenticated) {
      openAuthModal(() => navigate("/perfil"));
    }
  }, [isLoadingSession, isAuthenticated, openAuthModal, navigate]);

  if (isLoadingSession) {
    return <Mensaje texto="Comprobando sesión..." />;
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/" replace />;
}

export default ProtectedRoute;
