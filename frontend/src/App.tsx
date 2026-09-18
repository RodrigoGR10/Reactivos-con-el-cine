import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import PaginaPrincipal from './pages/PaginaPrincipal'
import MovieDetailPage from './pages/MovieDetailPage'
import AuthPage from './pages/AuthPage'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PaginaPrincipal />} />
          <Route path="/peliculas/:id" element={<MovieDetailPage />} />
          <Route path="/login" element={<AuthPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
export default App