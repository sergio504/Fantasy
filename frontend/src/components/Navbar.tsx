import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const isActive = (path: string) => location.pathname === path

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to={usuario ? '/inicio' : '/'} className="flex items-center gap-2">
          <span className="text-xl">⚽</span>
          <span className="font-bold text-gray-900 tracking-tight">
            Fantasy<span className="text-indigo-600">Fútbol</span>
          </span>
        </Link>

        {usuario ? (
          <div className="flex items-center gap-1">
            <Link
              to="/explorar"
              className={`hidden sm:block text-sm px-3 py-1.5 rounded-lg transition-colors ${
                isActive('/explorar')
                  ? 'bg-indigo-50 text-indigo-600 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Explorar
            </Link>
            <Link
              to="/ligas"
              className={`hidden sm:block text-sm px-3 py-1.5 rounded-lg transition-colors ${
                isActive('/ligas')
                  ? 'bg-indigo-50 text-indigo-600 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Ligas públicas
            </Link>
            <Link
              to="/inicio"
              className={`hidden sm:block text-sm px-3 py-1.5 rounded-lg transition-colors ${
                isActive('/inicio')
                  ? 'bg-indigo-50 text-indigo-600 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Mis ligas
            </Link>
            <div className="w-px h-5 bg-gray-200 mx-1 hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 bg-gray-100 px-3 py-1.5 rounded-lg">
                {usuario.username}
              </span>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-400 hover:text-red-500 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
              >
                Salir
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Entrar
            </Link>
            <Link
              to="/register"
              className="text-sm bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              Registrarse
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}
