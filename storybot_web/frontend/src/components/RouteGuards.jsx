import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'

export function Loading({ text = '불러오는 중...' }) {
  return (
    <div className="loading">
      <span className="dot" />
      <span className="dot" />
      <span className="dot" />
      <p>{text}</p>
    </div>
  )
}

export function ProtectedRoute() {
  const { token, user, loading } = useAuth()
  const location = useLocation()

  if (!token) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  if (loading || !user) return <Loading />
  return <Outlet />
}

export function PublicOnlyRoute() {
  const { token } = useAuth()
  if (token) return <Navigate to="/" replace />
  return <Outlet />
}
