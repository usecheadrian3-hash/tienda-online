import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { useStore } from '../../contexts/StoreContext'
import { useAuth } from '../../contexts/AuthContext'
import { useCart } from '../../contexts/CartContext'
import { useFavorites } from '../../contexts/FavoritesContext'
import { useToast } from '../../contexts/ToastContext'

export default function MobileMenu({ open, onClose }) {
  const { nav } = useStore()
  const { user, logout } = useAuth()
  const { count } = useCart()
  const { ids } = useFavorites()
  const { toast } = useToast()

  if (!open) return null

  const close = () => onClose()
  const handleLogout = () => {
    logout()
    toast('Sesión cerrada', 'info')
    close()
  }

  return (
    <>
      <div className="overlay" onClick={close} />
      <div className="mobile-menu">
        <div className="mobile-menu-head">
          <strong>Menú</strong>
          <button className="btn-icon" onClick={close} aria-label="Cerrar">
            <X size={22} />
          </button>
        </div>
        <div className="mobile-menu-body">
          <nav>
            <Link to="/" onClick={close}>Inicio</Link>
            <Link to="/tienda" onClick={close}>Tienda</Link>
            <div className="mobile-menu-group">
              <span>Categorías</span>
              {nav?.categories?.slice(0, 12).map((c) => (
                <Link key={c.id} to={`/categoria/${c.slug}`} onClick={close}>
                  {c.name}
                </Link>
              ))}
            </div>
            <Link to="/blog" onClick={close}>Blog</Link>
            <Link to="/carrito" onClick={close}>Carrito ({count})</Link>
            <Link to="/cuenta/favoritos" onClick={close}>Favoritos ({ids.length})</Link>
            {user ? (
              <>
                <Link to="/cuenta" onClick={close}>Mi cuenta</Link>
                <Link to="/cuenta/pedidos" onClick={close}>Mis pedidos</Link>
                {user.is_admin && <Link to="/admin" onClick={close}>Panel admin</Link>}
                <button className="menu-logout" onClick={handleLogout}>Cerrar sesión</button>
              </>
            ) : (
              <Link to="/login" onClick={close}>Iniciar sesión</Link>
            )}
          </nav>
        </div>
      </div>
    </>
  )
}
