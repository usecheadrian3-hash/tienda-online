import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Box, CreditCard, Home, LayoutDashboard, Megaphone, Package, Percent,
  Settings, ShoppingBag, Store, Ticket, Truck, Users,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useStore } from '../../contexts/StoreContext'
import { initials } from '../../utils/format'

const MENU = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/pedidos', label: 'Pedidos', icon: ShoppingBag },
  { to: '/admin/productos', label: 'Productos', icon: Box },
  { to: '/admin/inventario', label: 'Inventario', icon: Package },
  { to: '/admin/categorias', label: 'Categorías y marcas', icon: Ticket },
  { to: '/admin/cupones', label: 'Cupones', icon: Percent },
  { to: '/admin/contenido', label: 'Contenido', icon: Megaphone },
  { to: '/admin/clientes', label: 'Clientes', icon: Users },
  { to: '/admin/configuracion', label: 'Configuración', icon: Settings },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const { storeName } = useStore()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const sidebar = (
    <aside className="admin-sidebar">
      <Link to="/" className="admin-brand">
        <span className="logo-mark"><Store size={20} /></span>
        <div>
          <strong>{storeName}</strong>
          <small>Panel de administración</small>
        </div>
      </Link>
      <nav>
        {MENU.map((m) => (
          <NavLink
            key={m.to}
            to={m.to}
            end={m.end}
            className={({ isActive }) => (isActive ? 'active' : '')}
            onClick={() => setOpen(false)}
          >
            <m.icon size={17} /> {m.label}
          </NavLink>
        ))}
      </nav>
      <div className="admin-sidebar-foot">
        <Link to="/" className="admin-back-link"><Home size={16} /> Volver a la tienda</Link>
        <button
          className="admin-back-link"
          onClick={() => {
            logout()
            navigate('/login')
          }}
        >
          <Truck size={16} /> Cerrar sesión
        </button>
      </div>
    </aside>
  )

  return (
    <div className="admin-layout">
      <div className="admin-sidebar-wrap">{sidebar}</div>
      <div className="admin-main">
        <header className="admin-topbar">
          <button className="btn-icon admin-menu-btn" onClick={() => setOpen((v) => !v)} aria-label="Menú">
            <MenuIcon />
          </button>
          <div className="admin-search" />
          <div className="admin-user">
            <div className="admin-user-avatar">{initials(user?.name)}</div>
            <div>
              <strong>{user?.name}</strong>
              <small>{user?.email}</small>
            </div>
          </div>
        </header>
        {open && (
          <>
            <div className="overlay admin-mobile-overlay" onClick={() => setOpen(false)} />
            <div className="admin-mobile-drawer">{sidebar}</div>
          </>
        )}
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}
