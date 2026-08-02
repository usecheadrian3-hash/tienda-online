import { NavLink } from 'react-router-dom'
import { Heart, Home, Search, ShoppingBag, User } from 'lucide-react'
import { useCart } from '../../contexts/CartContext'
import { useFavorites } from '../../contexts/FavoritesContext'

export default function MobileNav({ onOpenSearch }) {
  const { count } = useCart()
  const { ids } = useFavorites()

  return (
    <nav className="mobile-nav">
      <NavLink to="/" end>
        <Home size={21} />
        Inicio
      </NavLink>
      <button onClick={onOpenSearch} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <Search size={21} />
        Buscar
      </button>
      <NavLink to="/carrito">
        <ShoppingBag size={21} />
        Carrito
        {count > 0 && <span className="count-badge">{count}</span>}
      </NavLink>
      <NavLink to="/cuenta/favoritos">
        <Heart size={21} />
        Favoritos
        {ids.length > 0 && <span className="count-badge">{ids.length}</span>}
      </NavLink>
      <NavLink to="/cuenta">
        <User size={21} />
        Cuenta
      </NavLink>
    </nav>
  )
}
