import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDownRight, ArrowUpRight, Box, DollarSign, Package, ShoppingBag, Users,
} from 'lucide-react'
import { formatPrice } from '../../utils/format'
import { formatDate } from '../../utils/format'
import { PageLoader } from '../../components/ui/Loaders'

export default function AdminDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/admin/dashboard', {
          headers: { Authorization: `Bearer ${localStorage.getItem('tienda_token')}` },
        })
        const payload = await res.json()
        setData(payload.data)
      } catch (e) {
        setData(null)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) return <PageLoader />

  const k = data?.kpis || {}
  const symbol = data?.symbol || '$'
  const currency = data?.currency || 'COP'

  const cards = [
    { label: 'Ingresos totales', value: formatPrice(k.revenue_total || 0, symbol, currency), icon: DollarSign, trend: '+12% vs mes anterior' },
    { label: 'Ingresos del mes', value: formatPrice(k.revenue_month || 0, symbol, currency), icon: ArrowUpRight, trend: 'Ventas actuales' },
    { label: 'Pedidos', value: k.orders_total || 0, icon: ShoppingBag, trend: `${k.orders_paid || 0} pagados` },
    { label: 'Ticket promedio', value: formatPrice(k.avg_ticket || 0, symbol, currency), icon: ArrowDownRight, trend: `${k.conversion || 0}% conversión` },
    { label: 'Clientes', value: k.customers || 0, icon: Users, trend: 'Registrados' },
    { label: 'Productos', value: k.products || 0, icon: Box, trend: `${k.low_stock || 0} stock bajo` },
  ]

  const maxRevenue = Math.max(...(data?.sales_chart || []).map((r) => r.revenue), 1)

  const statusLabels = {
    pending: 'Pendiente', paid: 'Pagado', preparing: 'Preparando', shipped: 'Enviado',
    delivered: 'Entregado', canceled: 'Cancelado',
  }

  return (
    <div>
      <h1 className="admin-page-title">Dashboard</h1>
      <p className="admin-page-sub">Resumen general de tu tienda.</p>

      <div className="admin-kpi-grid">
        {cards.map((c) => (
          <div className="admin-kpi" key={c.label}>
            <div className="admin-kpi-icon"><c.icon size={20} /></div>
            <div>
              <div className="admin-kpi-value">{c.value}</div>
              <div className="admin-kpi-label">{c.label}</div>
              <div className="admin-kpi-trend">{c.trend}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="admin-grid-2">
        <div className="admin-card">
          <h2>Ventas últimos 14 días</h2>
          <div className="admin-chart">
            {data?.sales_chart?.map((d) => (
              <div className="admin-chart-col" key={d.date} title={`${d.date}: ${formatPrice(d.revenue, symbol, currency)}`}>
                <div
                  className="admin-chart-bar"
                  style={{ height: `${Math.max(4, (d.revenue / maxRevenue) * 100)}%` }}
                />
                <span>{d.date.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-card">
          <h2>Estados de pedidos</h2>
          <div className="admin-status-list">
            {Object.entries(data?.status_counts || {}).map(([status, count]) => (
              <div className="admin-status-row" key={status}>
                <span>{statusLabels[status] || status}</span>
                <div className="admin-status-track">
                  <span
                    style={{
                      width: `${(count / Math.max(data.status_counts.total || Object.values(data.status_counts).reduce((a, b) => a + b, 0), 1)) * 100}%`,
                    }}
                  />
                </div>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="admin-grid-2">
        <div className="admin-card">
          <h2>Top productos</h2>
          <table className="admin-table">
            <thead>
              <tr><th>Producto</th><th>Vendidos</th><th>Ingresos</th></tr>
            </thead>
            <tbody>
              {data?.top_products?.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.qty}</td>
                  <td>{formatPrice(p.revenue, symbol, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="admin-card">
          <h2>Pedidos recientes</h2>
          <div className="admin-order-list">
            {data?.recent_orders?.map((o) => (
              <Link to={`/admin/pedidos/${o.order_number}`} className="admin-order-row" key={o.order_number}>
                <div>
                  <strong>{o.order_number}</strong>
                  <small>{o.customer} · {formatDate(o.created_at)}</small>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong>{formatPrice(o.total, symbol, currency)}</strong>
                  <span className={`badge ${o.payment_status === 'approved' ? 'badge-success' : 'badge-warning'}`}>
                    {o.payment_status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
