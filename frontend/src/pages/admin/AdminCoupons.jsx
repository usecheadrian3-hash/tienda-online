import { useCallback, useEffect, useState } from 'react'
import { Pencil, Plus, Trash2, X } from 'lucide-react'
import api from '../../services/api'
import { useToast } from '../../contexts/ToastContext'
import { formatDate, formatPrice } from '../../utils/format'
import { PageLoader } from '../../components/ui/Loaders'

const EMPTY = {
  code: '', type: 'percent', value: '', min_subtotal: '0',
  max_uses: '', starts_at: '', ends_at: '', is_active: true,
}

export default function AdminCoupons() {
  const { toast } = useToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/api/admin/coupons')
      setItems(res.data)
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchData() }, [fetchData])

  const save = async () => {
    if (!editing.code.trim() || editing.value === '') {
      toast('Código y valor son requeridos', 'error')
      return
    }
    setSaving(true)
    const payload = {
      ...editing,
      code: editing.code.trim().toUpperCase(),
      value: parseFloat(editing.value),
      min_subtotal: parseFloat(editing.min_subtotal || '0'),
      max_uses: editing.max_uses ? parseInt(editing.max_uses, 10) : null,
    }
    try {
      if (editing.id) {
        await api.put(`/api/admin/coupons/${editing.id}`, payload)
        toast('Cupón actualizado', 'success')
      } else {
        await api.post('/api/admin/coupons', payload)
        toast('Cupón creado', 'success')
      }
      setEditing(null)
      fetchData()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (c) => {
    if (!window.confirm(`¿Eliminar el cupón ${c.code}?`)) return
    try {
      await api.delete(`/api/admin/coupons/${c.id}`)
      toast('Cupón eliminado', 'success')
      fetchData()
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  const toggle = async (c) => {
    try {
      await api.put(`/api/admin/coupons/${c.id}`, { is_active: !c.is_active })
      toast('Estado actualizado', 'success')
      fetchData()
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h1 className="admin-page-title">Cupones</h1>
          <p className="admin-page-sub">Crea promociones de descuento para tus clientes.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing({ ...EMPTY })}>
          <Plus size={17} /> Nuevo cupón
        </button>
      </div>

      {loading ? (
        <PageLoader />
      ) : items.length === 0 ? (
        <div className="admin-empty">Aún no hay cupones. Crea el primero.</div>
      ) : (
        <div className="admin-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Descuento</th>
                <th>Mínimo</th>
                <th>Vigencia</th>
                <th>Usos</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id}>
                  <td>
                    <span className="coupon-chip">{c.code}</span>
                  </td>
                  <td>{c.type === 'percent' ? `${c.value}%` : formatPrice(c.value)}</td>
                  <td>{c.min_subtotal > 0 ? formatPrice(c.min_subtotal) : '—'}</td>
                  <td>
                    {c.ends_at ? `Hasta ${formatDate(c.ends_at)}` : 'Sin vencimiento'}
                  </td>
                  <td>
                    <span className={`badge ${c.max_uses != null && c.used_count >= c.max_uses ? 'badge-danger' : 'badge-gray'}`}>
                      {c.used_count}{c.max_uses != null ? ` / ${c.max_uses}` : ''}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${c.is_active ? 'badge-success' : 'badge-gray'}`}>
                      {c.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <div className="admin-row-actions">
                      <button className="btn-icon" onClick={() => toggle(c)} title="Activar/Desactivar">
                        <span className={`dot-toggle ${c.is_active ? 'on' : ''}`} />
                      </button>
                      <button className="btn-icon" onClick={() => setEditing({ ...c, value: String(c.value), min_subtotal: String(c.min_subtotal || 0), max_uses: c.max_uses != null ? String(c.max_uses) : '' })} title="Editar"><Pencil size={16} /></button>
                      <button className="btn-icon danger" onClick={() => remove(c)} title="Eliminar"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="admin-modal">
          <div className="admin-modal-backdrop" onClick={() => setEditing(null)} />
          <div className="admin-modal-body">
            <div className="admin-modal-head">
              <h2>{editing.id ? 'Editar cupón' : 'Nuevo cupón'}</h2>
              <button className="btn-icon" onClick={() => setEditing(null)}><X size={20} /></button>
            </div>
            <div className="admin-modal-scroll">
              <div className="field">
                <label>Código *</label>
                <input value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })} placeholder="VERANO70" />
              </div>
              <div className="field-grid">
                <div className="field">
                  <label>Tipo</label>
                  <select value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value })}>
                    <option value="percent">Porcentaje (%)</option>
                    <option value="fixed">Monto fijo</option>
                  </select>
                </div>
                <div className="field">
                  <label>Valor *</label>
                  <input type="number" value={editing.value} onChange={(e) => setEditing({ ...editing, value: e.target.value })} />
                </div>
              </div>
              <div className="field-grid">
                <div className="field">
                  <label>Monto mínimo de compra</label>
                  <input type="number" value={editing.min_subtotal} onChange={(e) => setEditing({ ...editing, min_subtotal: e.target.value })} />
                </div>
                <div className="field">
                  <label>Usos máximos (vacío = ilimitado)</label>
                  <input type="number" value={editing.max_uses} onChange={(e) => setEditing({ ...editing, max_uses: e.target.value })} />
                </div>
              </div>
              <div className="field-grid">
                <div className="field">
                  <label>Inicia</label>
                  <input type="datetime-local" value={editing.starts_at ? editing.starts_at.slice(0, 16) : ''} onChange={(e) => setEditing({ ...editing, starts_at: e.target.value || '' })} />
                </div>
                <div className="field">
                  <label>Termina</label>
                  <input type="datetime-local" value={editing.ends_at ? editing.ends_at.slice(0, 16) : ''} onChange={(e) => setEditing({ ...editing, ends_at: e.target.value || '' })} />
                </div>
              </div>
              <label className="checkbox-row">
                <input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />
                Activo
              </label>
            </div>
            <div className="admin-modal-foot">
              <button className="btn btn-outline" onClick={() => setEditing(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar cupón'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
