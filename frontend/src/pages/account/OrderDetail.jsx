import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Check, CreditCard, FileText, Package, Truck, X } from 'lucide-react'
import { useStore } from '../../contexts/StoreContext'
import { formatDateTime, formatPrice } from '../../utils/format'
import { PageLoader } from '../../components/ui/Loaders'
import EmptyState from '../../components/ui/EmptyState'
import Breadcrumb from '../../components/ui/Breadcrumb'

const ICONS = [Package, CreditCard, Package, Truck, Check]

export default function OrderDetail() {
  const { orderNumber } = useParams()
  const { symbol, currency, taxName } = useStore()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setNotFound(false)
    ;(async () => {
      try {
        const [detailRes, trackingRes] = await Promise.all([
          fetch(`/api/orders/${orderNumber}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('tienda_token')}` },
          }),
          fetch(`/api/orders/${orderNumber}/tracking`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('tienda_token')}` },
          }),
        ])
        const detail = await detailRes.json()
        const tracking = await trackingRes.json()
        if (cancelled) return
        if (!detail.ok || !tracking.ok) {
          setNotFound(true)
          return
        }
        setData({ order: detail.data, timeline: tracking.data.timeline })
      } catch (e) {
        if (!cancelled) setNotFound(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [orderNumber])

  if (loading) return <PageLoader />
  if (notFound || !data) {
    return (
      <div className="container">
        <EmptyState
          title="Pedido no encontrado"
          subtitle="Verifica el número del pedido o inicia sesión con la cuenta correcta."
          action={{ to: '/cuenta/pedidos', label: 'Mis pedidos' }}
        />
      </div>
    )
  }

  const { order, timeline } = data
  const currentIndex = timeline.findIndex((t) => !t.done)
  const canPay = order.payment_status !== 'approved' && !['canceled', 'expired'].includes(order.payment_status)

  return (
    <div>
      <Breadcrumb
        items={[
          { label: 'Mis pedidos', to: '/cuenta/pedidos' },
          { label: order.order_number },
        ]}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{order.order_number}</h1>
          <div className="oc-date">{formatDateTime(order.created_at)}</div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {canPay && (
            <Link to={`/pago/${order.order_number}`} className="btn btn-primary btn-sm">
              <CreditCard size={16} /> Completar pago
            </Link>
          )}
          {order.payment_status === 'approved' && (
            <a
              href={`/api/orders/${order.order_number}/receipt.pdf`}
              className="btn btn-dark btn-sm"
              target="_blank"
              rel="noreferrer"
            >
              <FileText size={16} /> Comprobante PDF
            </a>
          )}
        </div>
      </div>

      <div className="checkout-card">
        <h3>Estado del pedido</h3>
        <div className="timeline">
          {timeline.map((t, i) => {
            const Icon = ICONS[i] || Check
            const cls = t.done ? 'done' : i === currentIndex ? 'current' : ''
            return (
              <div className={`tl-item ${cls}`} key={t.step}>
                <div className="tl-dot">
                  {t.done ? <Check size={18} /> : <Icon size={17} />}
                </div>
                <div>
                  <div className="tl-title">{t.step}</div>
                  {t.date && <div className="tl-date">{formatDateTime(t.date)}</div>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="checkout-card">
        <h3>Productos</h3>
        {order.items?.map((it) => (
          <div className="co-review-line" key={it.id}>
            <div className="cr-left">
              {it.image ? (
                <img src={it.image} alt={it.product_name} style={{ borderRadius: 10 }} />
              ) : (
                <span style={{ width: 48, height: 48, borderRadius: 10, background: 'var(--gray-100)' }} />
              )}
              <div>
                <strong style={{ fontSize: '.92rem' }}>{it.product_name}</strong>
                {it.variant_name && <div className="cr-variant">{it.variant_name}</div>}
                <div className="cr-variant">Cantidad: {it.quantity}</div>
              </div>
            </div>
            <strong>{formatPrice(it.subtotal, symbol, currency)}</strong>
          </div>
        ))}
        <div style={{ borderTop: '1px solid var(--gray-100)', margin: '12px 0' }} />
        <div className="os-row"><span>Subtotal</span><strong>{formatPrice(order.subtotal, symbol, currency)}</strong></div>
        {order.discount > 0 && (
          <div className="os-row" style={{ color: 'var(--success)' }}>
            <span>Descuento {order.coupon_code ? `(${order.coupon_code})` : ''}</span>
            <strong>-{formatPrice(order.discount, symbol, currency)}</strong>
          </div>
        )}
        <div className="os-row"><span>Envío</span><strong>{order.shipping_cost === 0 ? 'Gratis' : formatPrice(order.shipping_cost, symbol, currency)}</strong></div>
        {order.tax_amount > 0 && (
          <div className="os-row"><span>{taxName}</span><strong>{formatPrice(order.tax_amount, symbol, currency)}</strong></div>
        )}
        <div className="os-total"><span>Total</span><span>{formatPrice(order.total, symbol, currency)}</span></div>
      </div>

      <div className="checkout-card">
        <h3>Envío y contacto</h3>
        <div className="receipt-meta" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <div>
            <div className="rm-label">Dirección</div>
            <div className="rm-value">{order.address}, {order.city} {order.state}</div>
          </div>
          <div>
            <div className="rm-label">Método</div>
            <div className="rm-value">{order.shipping_method}</div>
          </div>
          <div>
            <div className="rm-label">Contacto</div>
            <div className="rm-value">{order.email} {order.phone ? `· ${order.phone}` : ''}</div>
          </div>
          <div>
            <div className="rm-label">Pago</div>
            <div className="rm-value">
              {order.payment_method} · {order.payment_status}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
