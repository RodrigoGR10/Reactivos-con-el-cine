import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { FavoritesProvider } from './context/FavoritesContext'
import PaginaPrincipal from './pages/PaginaPrincipal'
import MovieDetailPage from './pages/MovieDetailPage'
import AuthPage from './pages/AuthPage'
import ProfilePage from './pages/ProfilePage'

function App() {
  return (
    <AuthProvider>
      <FavoritesProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<PaginaPrincipal />} />
            <Route path="/peliculas/:id" element={<MovieDetailPage />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/perfil" element={<ProfilePage />} />
          </Routes>
        </BrowserRouter>
      </FavoritesProvider>
    </AuthProvider>
  )
}
export default App