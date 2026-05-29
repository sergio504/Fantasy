import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Spinner from './Spinner'

export default function PublicOnlyRoute() {
  const { usuario, loading } = useAuth()
  if (loading) return <Spinner />
  if (usuario) return <Navigate to="/inicio" replace />
  return <Outlet />
}
