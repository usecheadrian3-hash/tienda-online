import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Package } from 'lucide-react'
import { useStore } from '../../contexts/StoreContext'
import { formatDate, formatPrice } from '../../utils/format'
import EmptyState from '../../components/ui/EmptyState'
import { PageLoader } from '../../components/ui/Loaders'

const STATUS_LABEL = {
  pending: 'Pendiente',
  paid: 'Pagado',
  preparing: 'En preparación',
  shipped: 'Enviado',
  delivered: 'Entregado',
  canceled: 'Cancelado',
}

export default function Orders() {
  const { symbol, currency } = useStore()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/orders/mine', {
          headers: { Authorization: `Bearer ${localStorage.getItem('tienda_token')}` },
        })
        const payload = await res.json()
        setOrders(payload.data || [])
      } catch (e) {
        setOrders([])
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) return <PageLoader />

  return (
    <div>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 20 }}>Mis pedidos</h1>
      {!orders.length ? (
        <EmptyState
          icon={Package}
          title="Aún no tienes pedidos"
          subtitle="Cuando hagas tu primera compra, aquí aparecerá el seguimiento."
          action={{ to: '/tienda', label: 'Ir de compras' }}
        />
      ) : (
        orders.map((o) => (
          <div className="order-card" key={o.order_number}>
            <div className="oc-head">
              <div>
                <div className="oc-num">{o.order_number}</div>
                <div className="oc-date">{formatDate(o.created_at)}</div>
              </div>
              <span className={`badge ${o.payment_status === 'approved' ? 'badge-success' : o.status === 'canceled' ? 'badge-danger' : 'badge-warning'}`}>
                {o.payment_status === 'approved' ? 'Pagado' : STATUS_LABEL[o.status] || o.status}
              </span>
            </div>
            <div className="oc-items">
              {o.items?.slice(0, 4).map((it) => (
                <span key={it.id} style={{ position: 'relative' }}>
                  {it.image ? (
                    <img src={it.image} alt={it.product_name} style={{ borderRadius: 10 }} />
                  ) : (
                    <span style={{ width: 52, height: 52, display: 'block', borderRadius: 10, background: 'var(--gray-100)' }} />
                  )}
                </span>
              ))}
              {o.items?.length > 4 && (
                <span className="oc-date" style={{ alignSelf: 'center' }}>+{o.items.length - 4}</span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div className="oc-total">{formatPrice(o.total, symbol, currency)}</div>
              <div className="oc-actions">
                <Link to={`/cuenta/pedidos/${o.order_number}`} className="btn btn-outline btn-sm">
                  Seguimiento
                </Link>
                <Link to={`/cuenta/pedidos/${o.order_number}`} className="btn btn-dark btn-sm">
                  <FileText size={15} /> Detalle
                </Link>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
