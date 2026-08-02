import { useCallback, useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'
import api from '../../services/api'
import { useToast } from '../../contexts/ToastContext'
import { PageLoader } from '../../components/ui/Loaders'

const STATUS_LABEL = {
  out: { text: 'Sin stock', cls: 'badge-danger' },
  low: { text: 'Stock bajo', cls: 'badge-warning' },
  ok: { text: 'Disponible', cls: 'badge-success' },
  overstock: { text: 'Sobre stock', cls: 'badge-gray' },
}

export default function AdminInventory() {
  const { toast } = useToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [adjusting, setAdjusting] = useState(null)
  const [quantity, setQuantity] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/api/admin/inventory')
      setItems(res.data)
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = q
    ? items.filter((i) => `${i.name} ${i.sku}`.toLowerCase().includes(q.toLowerCase()))
    : items

  const adjust = async (type) => {
    const value = parseInt(quantity || '0', 10)
    if (!value) {
      toast('Ingresa una cantidad', 'error')
      return
    }
    setSaving(true)
    try {
      await api.post('/api/admin/inventory/adjust', {
        product_id: adjusting.id,
        quantity: type === 'remove' ? -Math.abs(value) : Math.abs(value),
        type: type === 'remove' ? 'sale' : 'restock',
        note,
      })
      toast('Inventario actualizado', 'success')
      setAdjusting(null)
      setQuantity('')
      setNote('')
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
          <h1 className="admin-page-title">Inventario</h1>
          <p className="admin-page-sub">Controla el stock de todos tus productos.</p>
        </div>
      </div>

      <div className="admin-toolbar">
        <div className="admin-search">
          <Search size={17} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrar por nombre o SKU…" />
        </div>
      </div>

      {loading ? (
        <PageLoader />
      ) : (
        <div className="admin-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>SKU</th>
                <th>Stock</th>
                <th>Mínimo</th>
                <th>Vendidos</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const st = STATUS_LABEL[p.status] || STATUS_LABEL.ok
                return (
                  <tr key={p.id}>
                    <td><strong>{p.name}</strong></td>
                    <td>{p.sku}</td>
                    <td>
                      <span className={`stock-num ${p.status === 'out' ? 'is-out' : p.status === 'low' ? 'is-low' : ''}`}>
                        {p.stock}
                      </span>
                    </td>
                    <td>{p.stock_min}</td>
                    <td>{p.sold_count}</td>
                    <td>
                      <span className={`badge ${st.cls}`}>{st.text}</span>
                      {p.variants > 0 && <span className="badge badge-gray" style={{ marginLeft: 6 }}>{p.variants} var.</span>}
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        <button className="btn btn-outline btn-sm" onClick={() => { setAdjusting(p); setQuantity(''); setNote('') }}>
                          Ajustar
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {adjusting && (
        <div className="admin-modal">
          <div className="admin-modal-backdrop" onClick={() => setAdjusting(null)} />
          <div className="admin-modal-body">
            <div className="admin-modal-head">
              <h2>Ajustar stock: {adjusting.name}</h2>
              <button className="btn-icon" onClick={() => setAdjusting(null)}><X size={20} /></button>
            </div>
            <div className="admin-modal-scroll">
              <p className="muted">Stock actual: <strong>{adjusting.stock}</strong> · Mínimo: {adjusting.stock_min}</p>
              <div className="field">
                <label>Cantidad</label>
                <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Ej: 10" />
              </div>
              <div className="field">
                <label>Nota (opcional)</label>
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej: reposición proveedor" />
              </div>
            </div>
            <div className="admin-modal-foot">
              <button className="btn btn-outline" onClick={() => setAdjusting(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => adjust('remove')} disabled={saving}>Salida</button>
              <button className="btn btn-primary" onClick={() => adjust('add')} disabled={saving}>
                {saving ? 'Guardando…' : 'Entrada'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
