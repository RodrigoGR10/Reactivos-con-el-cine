import { Navigate, useNavigate } from "react-router-dom";
import { AuthModal } from "../components/auth/AuthModal";
import { Mensaje } from "../components/common/Mensaje";
import { useAuthStore } from "../stores/authStore";

function LoginPage() {
  const isAuthenticated = useAuthStore((state) => state.user !== null);
  const isLoadingSession = useAuthStore((state) => state.isLoadingSession);
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
