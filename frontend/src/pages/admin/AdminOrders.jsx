import { useCallback, useEffect, useState } from 'react'
import { FileText, Search } from 'lucide-react'
import api from '../../services/api'
import { useToast } from '../../contexts/ToastContext'
import { formatDate, formatDateTime, formatPrice } from '../../utils/format'
import { PageLoader } from '../../components/ui/Loaders'

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'paid', label: 'Pagado' },
  { value: 'preparing', label: 'Preparando' },
  { value: 'shipped', label: 'Enviado' },
  { value: 'delivered', label: 'Entregado' },
  { value: 'canceled', label: 'Cancelado' },
]

export default function AdminOrders() {
  const { toast } = useToast()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (status) params.set('status', status)
    params.set('page', page)
    try {
      const res = await api.get(`/api/admin/orders?${params.toString()}`)
      setData(res.data)
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [q, status, page, toast])

  useEffect(() => {
    setLoading(true)
    const t = setTimeout(fetchData, 300)
    return () => clearTimeout(t)
  }, [fetchData])

  const openDetail = async (orderNumber) => {
    setSelected(orderNumber)
    setDetailLoading(true)
    setNewStatus('')
    setNote('')
    try {
      const res = await api.get(`/api/admin/orders/${orderNumber}`)
      setSelected(res.data)
    } catch (e) {
      toast(e.message, 'error')
      setSelected(null)
    } finally {
      setDetailLoading(false)
    }
  }

  const updateStatus = async () => {
    if (!newStatus) return
    setSaving(true)
    try {
      await api.post(`/api/admin/orders/${selected.order_number}/status`, { status: newStatus, note })
      toast('Estado actualizado', 'success')
      setSelected(null)
      fetchData()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h1 className="admin-page-title">Pedidos</h1>
          <p className="admin-page-sub">Gestiona y da seguimiento a los pedidos.</p>
        </div>
      </div>

      <div className="admin-toolbar">
        <div className="admin-search">
          <Search size={17} />
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder="Buscar pedido, cliente o email…" />
        </div>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className="sort-select">
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {loading ? (
        <PageLoader />
      ) : (
        <div className="admin-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th>Total</th>
                <th>Pago</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {data?.items?.map((o) => (
                <tr key={o.order_number} onClick={() => openDetail(o.order_number)} style={{ cursor: 'pointer' }}>
                  <td><strong>{o.order_number}</strong></td>
                  <td>{o.customer}<br /><small>{o.email}</small></td>
                  <td>{formatDate(o.created_at)}</td>
                  <td>{formatPrice(o.total, data?.symbol)}</td>
                  <td>
                    <span className={`badge ${o.payment_status === 'approved' ? 'badge-success' : o.payment_status === 'pending' ? 'badge-warning' : 'badge-danger'}`}>
                      {o.payment_status}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${o.status === 'delivered' ? 'badge-success' : o.status === 'canceled' ? 'badge-danger' : 'badge-warning'}`}>
                      {o.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data?.pages > 1 && (
            <div className="pagination">
              {Array.from({ length: data.pages }).map((_, i) => (
                <button key={i} className={i + 1 === page ? 'active' : ''} onClick={() => setPage(i + 1)}>
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {selected && selected.order_number && (
        <div className="admin-modal">
          <div className="admin-modal-backdrop" onClick={() => setSelected(null)} />
          <div className="admin-modal-body admin-modal-lg">
            <div className="admin-modal-head">
              <h2>Pedido {selected.order_number}</h2>
              <button className="btn-icon" onClick={() => setSelected(null)}>✕</button>
            </div>
            {detailLoading ? (
              <PageLoader />
            ) : (
              <div className="admin-modal-scroll">
                <div className="admin-detail-grid">
                  <div>
                    <h4>Cliente</h4>
                    <p>{selected.customer}<br />{selected.email}<br />{selected.phone}</p>
                  </div>
                  <div>
                    <h4>Envío</h4>
                    <p>{selected.address}<br />{selected.city}, {selected.state}<br />Método: {selected.shipping_method}</p>
                  </div>
                </div>
                <table className="admin-table">
                  <thead><tr><th>Producto</th><th>Cant.</th><th>Subtotal</th></tr></thead>
                  <tbody>
                    {selected.items?.map((it) => (
                      <tr key={it.id}>
                        <td>{it.product_name}{it.variant_name ? ` (${it.variant_name})` : ''}</td>
                        <td>{it.quantity}</td>
                        <td>{formatPrice(it.subtotal, selected.symbol)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="admin-totals">
                  <div><span>Subtotal</span><strong>{formatPrice(selected.subtotal, selected.symbol)}</strong></div>
                  {selected.discount > 0 && <div><span>Descuento</span><strong>-{formatPrice(selected.discount, selected.symbol)}</strong></div>}
                  <div><span>Envío</span><strong>{formatPrice(selected.shipping_cost, selected.symbol)}</strong></div>
                  {selected.tax_amount > 0 && <div><span>{selected.tax_name}</span><strong>{formatPrice(selected.tax_amount, selected.symbol)}</strong></div>}
                  <div className="admin-total-line"><span>Total</span><strong>{formatPrice(selected.total, selected.symbol)}</strong></div>
                </div>

                <div className="admin-subsection">
                  <strong>Actualizar estado</strong>
                  <div className="admin-status-form">
                    <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="sort-select">
                      <option value="">Selecciona nuevo estado</option>
                      {STATUS_OPTIONS.filter((o) => o.value).map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nota (opcional)" />
                    <button className="btn btn-primary btn-sm" onClick={updateStatus} disabled={saving || !newStatus}>
                      {saving ? 'Guardando…' : 'Guardar'}
                    </button>
                  </div>
                </div>

                {selected.history?.length > 0 && (
                  <div className="admin-subsection">
                    <strong>Historial</strong>
                    {selected.history.map((h) => (
                      <div className="admin-history-row" key={h.id}>
                        <span className={`badge badge-gray`}>{h.status}</span>
                        <span>{h.note}</span>
                        <small>{formatDateTime(h.created_at)}</small>
                      </div>
                    ))}
                  </div>
                )}

                {selected.payment_status === 'approved' && (
                  <div className="admin-subsection">
                    <a
                      href={`/api/admin/orders/${selected.order_number}/receipt.pdf`}
                      className="btn btn-dark btn-sm"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <FileText size={15} /> Comprobante PDF
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
