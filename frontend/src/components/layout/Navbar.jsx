import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ChevronDown, Heart, Menu, Search, ShoppingBag, Store, User } from 'lucide-react'
import { useStore } from '../../contexts/StoreContext'
import { useCart } from '../../contexts/CartContext'
import { useFavorites } from '../../contexts/FavoritesContext'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { formatPrice } from '../../utils/format'

export default function Navbar({ onOpenSearch, onOpenMenu }) {
  const { nav, symbol, currency } = useStore()
  const { count, items, subtotal, openDrawer } = useCart()
  const { ids } = useFavorites()
  const { user, logout } = useAuth()
  const { toast } = useToast()
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()
  const minicartRef = useRef(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Cerrar mini carrito al navegar
  useEffect(() => {
    if (minicartRef.current) minicartRef.current.classList.remove('cart-hover-open')
  }, [location.pathname])

  const handleLogout = () => {
    logout()
    toast('Sesión cerrada', 'info')
  }

  return (
    <header className={`header ${scrolled ? 'scrolled' : ''}`}>
      <div className="container">
        <div className="header-inner">
          <button className="btn-icon icon-btn mobile-menu-btn" onClick={onOpenMenu} aria-label="Menú">
            <Menu size={22} />
          </button>

          <Link to="/" className="logo">
            <span className="logo-mark">
              <Store size={22} />
            </span>
            <span className="logo-name">
              TIENDA<em>.</em>
            </span>
          </Link>

          <nav className="nav desktop-nav" aria-label="Principal">
            <NavLink to="/" end className="nav-link" activeClassName="active">
              Inicio
            </NavLink>
            <NavLink to="/tienda" className="nav-link" activeClassName="active">
              Tienda
            </NavLink>
            {nav?.categories?.length > 0 && (
              <div className="nav-drop">
                <button className="nav-link">
                  Categorías <ChevronDown size={14} />
                </button>
                <div className="nav-drop-menu">
                  {nav.categories.slice(0, 10).map((c) => (
                    <Link key={c.id} to={`/categoria/${c.slug}`} className="nav-drop-item">
                      {c.name}
                      <small>{c.product_count}</small>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {nav?.brands?.length > 0 && (
              <div className="nav-drop">
                <button className="nav-link">
                  Marcas <ChevronDown size={14} />
                </button>
                <div className="nav-drop-menu">
                  {nav.brands.map((b) => (
                    <Link key={b.id} to={`/marca/${b.slug}`} className="nav-drop-item">
                      {b.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            <NavLink to="/blog" className="nav-link" activeClassName="active">
              Blog
            </NavLink>
          </nav>

          <div className="header-actions">
            <button className="icon-btn" onClick={onOpenSearch} aria-label="Buscar">
              <Search size={21} />
            </button>
            {user ? (
              <div className="nav-drop">
                <button className="icon-btn" aria-label="Cuenta">
                  <User size={21} />
                </button>
                <div className="nav-drop-menu account-drop">
                  <Link to="/cuenta" className="nav-drop-item">Mi cuenta</Link>
                  <Link to="/cuenta/pedidos" className="nav-drop-item">Mis pedidos</Link>
                  <Link to="/cuenta/favoritos" className="nav-drop-item">Favoritos</Link>
                  {user.is_admin && (
                    <Link to="/admin" className="nav-drop-item">Panel admin</Link>
                  )}
                  <button className="nav-drop-item" onClick={handleLogout}>Cerrar sesión</button>
                </div>
              </div>
            ) : (
              <Link to="/login" className="icon-btn" aria-label="Iniciar sesión">
                <User size={21} />
              </Link>
            )}
            <Link to="/cuenta/favoritos" className="icon-btn" aria-label="Favoritos">
              <Heart size={21} />
              {ids.length > 0 && <span className="count-badge">{ids.length}</span>}
            </Link>

            <div className="cart-hover" ref={minicartRef}>
              <button className="icon-btn" onClick={openDrawer} aria-label="Carrito">
                <ShoppingBag size={21} />
                {count > 0 && <span className="count-badge">{count}</span>}
              </button>
              <div className="mini-cart">
                {items.length === 0 ? (
                  <div className="empty-state" style={{ padding: 'var(--space-4)' }}>
                    <ShoppingBag size={40} />
                    <h3>Tu carrito está vacío</h3>
                    <Link to="/tienda" className="btn btn-dark btn-sm">Ir de compras</Link>
                  </div>
                ) : (
                  <>
                    {items.slice(0, 3).map((it) => (
                      <div className="mini-item" key={it.id}>
                        {it.product?.image && <img src={it.product.image} alt={it.product.name} />}
                        <div>
                          <div className="name">{it.product?.name}</div>
                          <div className="meta">
                            {it.quantity} × {formatPrice(it.unit_price, symbol, currency)}
                          </div>
                        </div>
                      </div>
                    ))}
                    {items.length > 3 && (
                      <div className="meta" style={{ padding: '8px 0', fontSize: '.8rem' }}>
                        Y {items.length - 3} artículos más…
                      </div>
                    )}
                    <div className="subtotal-row">
                      <span>Subtotal</span>
                      <span>{formatPrice(subtotal, symbol, currency)}</span>
                    </div>
                    <Link to="/carrito" className="btn btn-dark" style={{ width: '100%' }}>
                      Ver carrito y pagar
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
