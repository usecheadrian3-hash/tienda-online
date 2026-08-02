import { Link } from 'react-router-dom'
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react'
import { useCart } from '../../contexts/CartContext'
import { useStore } from '../../contexts/StoreContext'
import { formatPrice } from '../../utils/format'

export default function CartDrawer() {
  const { cart, items, count, subtotal, drawerOpen, closeDrawer, updateItem, removeItem } = useCart()
  const { symbol, currency, freeShipping } = useStore()

  if (!drawerOpen) return null

  const remaining = freeShipping ? freeShipping - subtotal : 0
  const progress = freeShipping ? Math.min(100, (subtotal / freeShipping) * 100) : 0

  return (
    <>
      <div className="drawer-backdrop" onClick={closeDrawer} />
      <aside className="cart-drawer" aria-label="Carrito de compras">
        <div className="drawer-head">
          <h3>
            <ShoppingBag size={20} /> Mi carrito <span>{count} artículos</span>
          </h3>
          <button className="btn-icon" onClick={closeDrawer} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <div className="drawer-body">
          {items.length === 0 ? (
            <div className="empty-state">
              <ShoppingBag size={56} />
              <h3>Tu carrito está vacío</h3>
              <p>Descubre productos seleccionados para ti.</p>
              <Link to="/tienda" className="btn btn-dark" onClick={closeDrawer}>
                Explorar tienda
              </Link>
            </div>
          ) : (
            <>
              {freeShipping > 0 && (
                <div className="free-ship-progress">
                  {remaining > 0 ? (
                    <>Te faltan <strong>{formatPrice(remaining, symbol, currency)}</strong> para el envío gratis</>
                  ) : (
                    <strong style={{ color: 'var(--success)' }}>¡Tienes envío gratis!</strong>
                  )}
                  <div className="free-ship-bar">
                    <span style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}
              {items.map((it) => (
                <div className="drawer-item" key={it.id}>
                  {it.product?.image && <img src={it.product.image} alt={it.product.name} />}
                  <div className="d-info">
                    <Link to={`/producto/${it.product?.slug}`} className="d-name" onClick={closeDrawer}>
                      {it.product?.name}
                    </Link>
                    {it.variant?.name && <div className="d-meta">{it.variant.name}</div>}
                    <div className="d-foot">
                      <div className="qty-stepper">
                        <button onClick={() => updateItem(it.id, it.quantity - 1)} aria-label="Restar">
                          <Minus size={14} />
                        </button>
                        <span>{it.quantity}</span>
                        <button onClick={() => updateItem(it.id, it.quantity + 1)} aria-label="Sumar">
                          <Plus size={14} />
                        </button>
                      </div>
                      <strong style={{ fontSize: '.92rem' }}>
                        {formatPrice(it.subtotal, symbol, currency)}
                      </strong>
                      <button
                        className="btn-icon"
                        onClick={() => removeItem(it.id)}
                        aria-label="Eliminar"
                        style={{ width: 32, height: 32 }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {items.length > 0 && (
          <div className="drawer-foot">
            <div className="subtotal-row">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal, symbol, currency)}</span>
            </div>
            <Link to="/carrito" className="btn btn-dark" style={{ width: '100%' }} onClick={closeDrawer}>
              Ir al carrito
            </Link>
            <Link
              to="/checkout"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 10 }}
              onClick={closeDrawer}
            >
              Finalizar compra
            </Link>
          </div>
        )}
      </aside>
    </>
  )
}
