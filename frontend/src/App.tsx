import "./App.css";
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { FavoritesProvider } from "./context/FavoritesContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import MainLayout from "./layouts/MainLayout";
import PaginaPrincipal from "./pages/PaginaPrincipal";
import MovieDetailPage from "./pages/MovieDetailPage";
import ProfilePage from "./pages/ProfilePage";
import CinemasPage from "./pages/CinemasPage";
import CinemaDetailPage from "./pages/CinemaDetailPage";

function LoginRedirect() {
  const { openAuthModal } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    openAuthModal(() => navigate("/perfil"));
  }, [openAuthModal, navigate]);

  return <Navigate to="/" replace />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <FavoritesProvider>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/" element={<PaginaPrincipal />} />
              <Route path="/peliculas/:id" element={<MovieDetailPage />} />
              <Route path="/cines" element={<CinemasPage />} />
              <Route path="/cines/:id" element={<CinemaDetailPage />} />
              <Route path="/login" element={<LoginRedirect />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/perfil" element={<ProfilePage />} />
              </Route>
            </Route>
          </Routes>
        </FavoritesProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}
export default App;
