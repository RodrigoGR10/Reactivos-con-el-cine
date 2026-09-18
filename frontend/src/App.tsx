import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import PaginaPrincipal from './pages/PaginaPrincipal'
import MovieDetailPage from './pages/MovieDetailPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PaginaPrincipal />} />
        <Route path="/peliculas/:id" element={<MovieDetailPage />} />
      </Routes>
    </BrowserRouter>
  )
}
export default App