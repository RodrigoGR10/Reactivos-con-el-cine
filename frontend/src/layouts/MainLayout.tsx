import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { AuthModal } from "../components/auth/AuthModal";
import { useAuthStore } from "../stores/authStore";

function MainLayout() {
  const isAuthModalOpen = useAuthStore((state) => state.isAuthModalOpen);
  const closeAuthModal = useAuthStore((state) => state.closeAuthModal);

  return (
    <div className="layout-root">
      <Sidebar />
      <main className="main-principal">
        <Outlet />
      </main>
      {isAuthModalOpen && (
        <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />
      )}
    </div>
  );
}

export default MainLayout;
