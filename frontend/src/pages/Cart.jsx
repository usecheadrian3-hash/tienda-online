import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Minus, Plus, ShoppingBag, Tag, Trash2, X } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { useStore } from '../contexts/StoreContext'
import { useToast } from '../contexts/ToastContext'
import { formatPrice } from '../utils/format'
import Breadcrumb from '../components/ui/Breadcrumb'
import EmptyState from '../components/ui/EmptyState'

export default function Cart() {
  const { items, count, subtotal, updateItem, removeItem, loading } = useCart()
  const { symbol, currency, freeShipping, shippingMethods } = useStore()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [couponCode, setCouponCode] = useState('')
  const [coupon, setCoupon] = useState(null)
  const [applying, setApplying] = useState(false)

  const validateCoupon = async (e) => {
    e.preventDefault()
    if (!couponCode.trim()) return
    setApplying(true)
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode, subtotal }),
      })
      const payload = await res.json()
      if (payload.ok) {
        setCoupon(payload.data)
        toast(payload.message, 'success')
      } else {
        setCoupon(null)
        toast(payload.message, 'error')
      }
    } catch (err) {
      toast('Error al validar el cupón', 'error')
    } finally {
      setApplying(false)
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div className="page-loader">Cargando carrito…</div>
      </div>
    )
  }

  if (!items.length) {
    return (
      <div className="container">
        <EmptyState
          icon={ShoppingBag}
          title="Tu carrito está vacío"
          subtitle="Descubre productos seleccionados para ti."
          action={{ to: '/tienda', label: 'Explorar tienda' }}
        />
      </div>
    )
  }

  const discount = coupon?.discount || 0
  const cheapestShipping = shippingMethods.find((m) => m.active && !m.min_subtotal) || null
  const shippingEstimate = cheapestShipping?.cost || 0
  const estimatedTotal = subtotal - discount + shippingEstimate

  return (
    <div className="container">
      <Breadcrumb items={[{ label: 'Carrito' }]} />
      <div className="cart-layout">
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 20 }}>
            Mi carrito <span style={{ fontSize: '1rem', color: 'var(--gray-500)', fontWeight: 500 }}>({count} artículos)</span>
          </h1>
          <div className="cart-table">
            {items.map((it) => (
              <div className="cart-row" key={it.id}>
                {it.product?.image ? (
                  <img src={it.product.image} alt={it.product.name} />
                ) : (
                  <div style={{ width: 90, height: 90, borderRadius: 12, background: 'var(--gray-100)' }} />
                )}
                <div>
                  <div className="cr-name">
                    <Link to={`/producto/${it.product?.slug}`}>{it.product?.name}</Link>
                  </div>
                  {it.variant?.name && <div className="cr-meta">{it.variant.name}</div>}
                  <div className="cr-unit">SKU: {it.product?.sku}</div>
                  <div className="cr-unit">{formatPrice(it.unit_price, symbol, currency)} c/u</div>
                </div>
                <div className="qty-stepper">
                  <button onClick={() => updateItem(it.id, it.quantity - 1)} aria-label="Restar">
                    <Minus size={14} />
                  </button>
                  <span>{it.quantity}</span>
                  <button onClick={() => updateItem(it.id, it.quantity + 1)} aria-label="Sumar">
                    <Plus size={14} />
                  </button>
                </div>
                <div className="cr-total">{formatPrice(it.subtotal, symbol, currency)}</div>
                <button className="cr-remove" onClick={() => removeItem(it.id)} aria-label="Eliminar">
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <aside className="order-summary">
          <h3>Resumen del pedido</h3>
          <div className="os-row">
            <span>Subtotal</span>
            <strong>{formatPrice(subtotal, symbol, currency)}</strong>
          </div>
          {coupon && (
            <div className="os-row" style={{ color: 'var(--success)' }}>
              <span>Cupón {coupon.code}</span>
              <strong>-{formatPrice(discount, symbol, currency)}</strong>
            </div>
          )}
          <div className="os-row">
            <span>Envío</span>
            <strong>{shippingEstimate === 0 ? 'Gratis' : formatPrice(shippingEstimate, symbol, currency)}</strong>
          </div>
          <div className="os-total">
            <span>Total estimado</span>
            <span>{formatPrice(estimatedTotal, symbol, currency)}</span>
          </div>

          <form className="coupon-box" onSubmit={validateCoupon}>
            <input
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder="Código de cupón"
              disabled={!!coupon}
            />
            <button className="btn btn-outline" type="submit" disabled={applying || !!coupon}>
              {coupon ? <X size={16} /> : <Tag size={16} />}
            </button>
          </form>
          {coupon && (
            <div className="coupon-applied">
              <span>Cupón {coupon.code} aplicado</span>
              <button onClick={() => setCoupon(null)}>Quitar</button>
            </div>
          )}

          {freeShipping > 0 && subtotal < freeShipping && (
            <p className="text-xs" style={{ color: 'var(--gray-500)', margin: '12px 0' }}>
              Agrega {formatPrice(freeShipping - subtotal, symbol, currency)} más para envío gratis.
            </p>
          )}

          <Link to="/checkout" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }}>
            Finalizar compra <ArrowRight size={17} />
          </Link>
          <button className="btn btn-ghost" style={{ width: '100%', marginTop: 6 }} onClick={() => navigate('/tienda')}>
            Seguir comprando
          </button>
        </aside>
      </div>
    </div>
  )
}
