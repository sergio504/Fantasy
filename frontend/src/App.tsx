import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import PublicOnlyRoute from './components/PublicOnlyRoute'
import AdminRoute from './components/AdminRoute'
import Navbar from './components/Navbar'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import ExplorePage from './pages/ExplorePage'
import CrearLigaPage from './pages/CrearLigaPage'
import LigaDetallePage from './pages/LigaDetallePage'
import MercadoPage from './pages/MercadoPage'
import TransferenciasPage from './pages/TransferenciasPage'
import MisJugadoresPage from './pages/MisJugadoresPage'
import AdminPage from './pages/AdminPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <Routes>
            {/* Rutas solo para no autenticados */}
            <Route element={<PublicOnlyRoute />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>

            {/* Rutas protegidas */}
            <Route element={<ProtectedRoute />}>
              <Route path="/inicio" element={<DashboardPage />} />
              <Route path="/ligas" element={<ExplorePage />} />
              <Route path="/ligas/crear" element={<CrearLigaPage />} />
              <Route path="/ligas/:ligaId" element={<LigaDetallePage />} />
              <Route path="/ligas/:ligaId/jugadores" element={<MisJugadoresPage />} />
              <Route path="/ligas/:ligaId/mercado" element={<MercadoPage />} />
              <Route path="/ligas/:ligaId/transferencias" element={<TransferenciasPage />} />
            </Route>

            {/* Ruta de administración */}
            <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
          </Routes>
        </div>
      </AuthProvider>
    </BrowserRouter>
  )
}
