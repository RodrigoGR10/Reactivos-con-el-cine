import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MovieDetailPage from "./pages/MovieDetailPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/peliculas/:id" element={<MovieDetailPage />} />
      </Routes>
    </Router>
  );
}

export default App;