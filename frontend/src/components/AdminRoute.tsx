import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Spinner from './Spinner'

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { usuario, loading } = useAuth()
  if (loading) return <Spinner />
  if (!usuario) return <Navigate to="/login" replace />
  if (!usuario.esAdmin) return <Navigate to="/inicio" replace />
  return <>{children}</>
}
