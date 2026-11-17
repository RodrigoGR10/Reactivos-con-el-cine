import { MantineProvider } from "@mantine/core";
import "./App.css";
import { cineCssVariablesResolver, cineTheme } from "./theme";
import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  RouterProvider,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { FavoritesProvider } from "./context/FavoritesContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import MainLayout from "./layouts/MainLayout";
import PaginaPrincipal from "./pages/PaginaPrincipal";
import MovieDetailPage from "./pages/MovieDetailPage";
import ProfilePage from "./pages/ProfilePage";
import CinemasPage from "./pages/CinemasPage";
import CinemaDetailPage from "./pages/CinemaDetailPage";
import LoginPage from "./pages/LoginPage";

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route
      element={
        <FavoritesProvider>
          <MainLayout />
        </FavoritesProvider>
      }
    >
      <Route path="/" element={<PaginaPrincipal />} />
      <Route path="/peliculas/:id" element={<MovieDetailPage />} />
      <Route path="/cines" element={<CinemasPage />} />
      <Route path="/cines/:id" element={<CinemaDetailPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/perfil" element={<ProfilePage />} />
      </Route>
    </Route>,
  ),
);

function App() {
  return (
    <MantineProvider
      theme={cineTheme}
      cssVariablesResolver={cineCssVariablesResolver}
      forceColorScheme="dark"
    >
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </MantineProvider>
  );
}
export default App;
