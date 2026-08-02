import { NavLink, Outlet } from 'react-router-dom'
import { Heart, LayoutDashboard, Package, User } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { initials } from '../../utils/format'

const LINKS = [
  { to: '/cuenta', label: 'Mi perfil', icon: User, end: true },
  { to: '/cuenta/pedidos', label: 'Mis pedidos', icon: Package },
  { to: '/cuenta/favoritos', label: 'Favoritos', icon: Heart },
]

export default function AccountLayout() {
  const { user } = useAuth()

  return (
    <div className="container">
      <div className="account-layout">
        <aside className="account-menu">
          <div className="am-user">
            <div className="am-avatar">{initials(user?.name)}</div>
            <div>
              <div className="am-name">{user?.name}</div>
              <div className="am-email">{user?.email}</div>
            </div>
          </div>
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? 'active' : '')}>
              <l.icon size={17} /> {l.label}
            </NavLink>
          ))}
          {user?.is_admin && (
            <NavLink to="/admin" className={({ isActive }) => (isActive ? 'active' : '')}>
              <LayoutDashboard size={17} /> Panel admin
            </NavLink>
          )}
        </aside>
        <div>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
