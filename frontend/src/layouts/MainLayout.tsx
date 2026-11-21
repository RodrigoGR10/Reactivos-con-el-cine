import { Outlet, ScrollRestoration, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { AuthModal } from "../components/auth/AuthModal";
import { useAuth } from "../context/AuthContext";
import { rutaInternaSegura } from "../utils/navegacion";

function MainLayout() {
  const { isAuthModalOpen, authModalRedirectTo, closeAuthModal } = useAuth();
  const navigate = useNavigate();
  const destinoPostLogin = rutaInternaSegura(authModalRedirectTo);

  const manejarExitoAuth = destinoPostLogin
    ? () => {
        closeAuthModal();
        navigate(destinoPostLogin);
      }
    : undefined;

  return (
    <div className="layout-root">
      <Sidebar />
      <main className="main-principal">
        <Outlet />
      </main>
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
        onSuccess={manejarExitoAuth}
      />
      <ScrollRestoration />
    </div>
  );
}

export default MainLayout;
