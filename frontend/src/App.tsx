import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { FavoritesProvider } from "./context/FavoritesContext";
import MainLayout from "./layouts/MainLayout";
import PaginaPrincipal from "./pages/PaginaPrincipal";
import MovieDetailPage from "./pages/MovieDetailPage";
import ProfilePage from "./pages/ProfilePage";
import CinemasPage from "./pages/CinemasPage";
import CinemaDetailPage from "./pages/CinemaDetailPage";

function App() {
  return (
    <AuthProvider>
      <FavoritesProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/" element={<PaginaPrincipal />} />
              <Route path="/peliculas/:id" element={<MovieDetailPage />} />
              <Route path="/cines" element={<CinemasPage />} />
              <Route path="/cines/:id" element={<CinemaDetailPage />} />
              <Route path="/perfil" element={<ProfilePage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </FavoritesProvider>
    </AuthProvider>
  );
}
export default App;
