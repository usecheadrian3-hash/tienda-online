import { useCallback, useEffect, useState } from 'react'
import { Eye, Search, X } from 'lucide-react'
import api from '../../services/api'
import { useToast } from '../../contexts/ToastContext'
import { formatDate, formatPrice } from '../../utils/format'
import { PageLoader } from '../../components/ui/Loaders'

export default function AdminCustomers() {
  const { toast } = useToast()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [detail, setDetail] = useState(null)

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    params.set('page', page)
    try {
      const res = await api.get(`/api/admin/customers?${params.toString()}`)
      setData(res.data)
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [q, page, toast])

  useEffect(() => {
    setLoading(true)
    const t = setTimeout(fetchData, 300)
    return () => clearTimeout(t)
  }, [fetchData])

  const openDetail = async (id) => {
    try {
      const res = await api.get(`/api/admin/customers/${id}`)
      setDetail(res.data)
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  const toggleStatus = async (c) => {
    try {
      await api.put(`/api/admin/customers/${c.id}/status`, { is_active: !c.is_active })
      toast('Cliente actualizado', 'success')
      fetchData()
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h1 className="admin-page-title">Clientes</h1>
          <p className="admin-page-sub">Gestiona tus clientes y su historial.</p>
        </div>
      </div>

      <div className="admin-toolbar">
        <div className="admin-search">
          <Search size={17} />
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder="Buscar cliente por nombre, email o teléfono…" />
        </div>
      </div>

      {loading ? (
        <PageLoader />
      ) : (
        <div className="admin-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Teléfono</th>
                <th>Registro</th>
                <th>Pedidos</th>
                <th>Total gastado</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {data?.items?.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.name}</strong>
                    <br />
                    <small>{c.email}</small>
                  </td>
                  <td>{c.phone || '—'}</td>
                  <td>{formatDate(c.created_at)}</td>
                  <td>{c.orders_count}</td>
                  <td>{formatPrice(c.total_spent)}</td>
                  <td>
                    <span className={`badge ${c.is_active ? 'badge-success' : 'badge-danger'}`}>
                      {c.is_active ? 'Activo' : 'Bloqueado'}
                    </span>
                  </td>
                  <td>
                    <div className="admin-row-actions">
                      <button className="btn-icon" onClick={() => openDetail(c.id)} title="Ver"><Eye size={16} /></button>
                      <button className="btn-icon" onClick={() => toggleStatus(c)} title="Activar/Bloquear">
                        <span className={`dot-toggle ${c.is_active ? 'on' : ''}`} />
                      </button>
                    </div>
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

      {detail && (
        <div className="admin-modal">
          <div className="admin-modal-backdrop" onClick={() => setDetail(null)} />
          <div className="admin-modal-body admin-modal-lg">
            <div className="admin-modal-head">
              <h2>{detail.user.name}</h2>
              <button className="btn-icon" onClick={() => setDetail(null)}><X size={20} /></button>
            </div>
            <div className="admin-modal-scroll">
              <div className="admin-detail-grid">
                <div>
                  <h4>Contacto</h4>
                  <p>{detail.user.email}<br />{detail.user.phone || 'Sin teléfono'}</p>
                </div>
                <div>
                  <h4>Total gastado</h4>
                  <p style={{ fontSize: 22, fontWeight: 700 }}>{formatPrice(detail.total_spent)}</p>
                </div>
              </div>
              <div className="admin-subsection">
                <strong>Pedidos ({detail.orders.length})</strong>
                {detail.orders.length === 0 && <p className="muted">Este cliente aún no tiene pedidos.</p>}
                {detail.orders.length > 0 && (
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Pedido</th>
                        <th>Fecha</th>
                        <th>Total</th>
                        <th>Pago</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.orders.map((o) => (
                        <tr key={o.order_number}>
                          <td><strong>{o.order_number}</strong></td>
                          <td>{formatDate(o.created_at)}</td>
                          <td>{formatPrice(o.total)}</td>
                          <td>
                            <span className={`badge ${o.payment_status === 'approved' ? 'badge-success' : 'badge-warning'}`}>
                              {o.payment_status}
                            </span>
                          </td>
                          <td><span className="badge badge-gray">{o.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
