import { MantineProvider } from "@mantine/core";
import "./App.css";
import { cineCssVariablesResolver, cineTheme } from "./theme";
import {
  createBrowserRouter,
  createRoutesFromElements,
  isRouteErrorResponse,
  Link,
  Outlet,
  Route,
  RouterProvider,
  useRouteError,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { FavoritesProvider } from "./context/FavoritesContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { Mensaje } from "./components/common/Mensaje";
import MainLayout from "./layouts/MainLayout";
import PaginaPrincipal from "./pages/PaginaPrincipal";
import MovieDetailPage from "./pages/MovieDetailPage";
import ProfilePage from "./pages/ProfilePage";
import CinemasPage from "./pages/CinemasPage";
import CinemaDetailPage from "./pages/CinemaDetailPage";
import LoginPage from "./pages/LoginPage";

function PaginaNoEncontrada() {
  return (
    <Mensaje
      tipo="error"
      titulo="Página no encontrada"
      texto="La página que buscas no existe o fue movida."
      accion={
        <Link to="/" className="mensaje-accion-link">
          ← Volver a cartelera
        </Link>
      }
    />
  );
}

function ErrorRuta() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) {
    return <PaginaNoEncontrada />;
  }
  return (
    <Mensaje
      tipo="error"
      titulo="Ocurrió un error inesperado"
      texto="No pudimos mostrar esta página. Intenta volver al inicio."
      accion={
        <Link to="/" className="mensaje-accion-link">
          ← Volver a cartelera
        </Link>
      }
    />
  );
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route
      element={
        <FavoritesProvider>
          <MainLayout />
        </FavoritesProvider>
      }
      errorElement={<ErrorRuta />}
    >
      <Route element={<Outlet />} errorElement={<ErrorRuta />}>
        <Route path="/" element={<PaginaPrincipal />} />
        <Route path="/peliculas/:id" element={<MovieDetailPage />} />
        <Route path="/cines" element={<CinemasPage />} />
        <Route path="/cines/:id" element={<CinemaDetailPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/perfil" element={<ProfilePage />} />
        </Route>
        <Route path="*" element={<PaginaNoEncontrada />} />
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
