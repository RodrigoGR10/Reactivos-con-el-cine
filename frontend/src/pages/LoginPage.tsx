import { Navigate, useNavigate } from "react-router-dom";
import { AuthModal } from "../components/auth/AuthModal";
import { Mensaje } from "../components/common/Mensaje";
import { useAuth } from "../context/AuthContext";

function LoginPage() {
  const { isAuthenticated, isLoadingSession } = useAuth();
  const navigate = useNavigate();

  if (isLoadingSession) {
    return <Mensaje texto="Comprobando sesión..." />;
  }

  if (isAuthenticated) {
    return <Navigate to="/perfil" replace />;
  }

  return (
    <AuthModal
      isOpen={true}
      onClose={() => navigate("/", { replace: true })}
      onSuccess={() => navigate("/perfil", { replace: true })}
    />
  );
}

export default LoginPage;
