import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { PageLoader } from './Loaders'

export default function RequireAuth({ children, admin = false }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <PageLoader />
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  if (admin && !user.is_admin) {
    return <Navigate to="/cuenta" replace />
  }
  return children
}
