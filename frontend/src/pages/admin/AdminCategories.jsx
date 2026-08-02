import { useCallback, useEffect, useState } from 'react'
import { Pencil, Plus, Trash2, X } from 'lucide-react'
import api from '../../services/api'
import { useToast } from '../../contexts/ToastContext'
import { PageLoader } from '../../components/ui/Loaders'

const EMPTY_CAT = { name: '', description: '', image: '', sort_order: '0', is_active: true }
const EMPTY_BRAND = { name: '', logo: '', description: '', sort_order: '0', is_active: true }

export default function AdminCategories() {
  const { toast } = useToast()
  const [tab, setTab] = useState('categories')
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState([])
  const [brands, setBrands] = useState([])
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [c, b] = await Promise.all([api.get('/api/admin/categories'), api.get('/api/admin/brands')])
      setCategories(c.data)
      setBrands(b.data)
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchData() }, [fetchData])

  const save = async () => {
    if (!editing.name.trim()) {
      toast('El nombre es requerido', 'error')
      return
    }
    setSaving(true)
    const base = tab === 'categories' ? 'categories' : 'brands'
    const payload = {
      ...editing,
      sort_order: parseInt(editing.sort_order || '0', 10),
    }
    try {
      if (editing.id) {
        await api.put(`/api/admin/${base}/${editing.id}`, payload)
        toast(tab === 'categories' ? 'Categoría actualizada' : 'Marca actualizada', 'success')
      } else {
        await api.post(`/api/admin/${base}`, payload)
        toast(tab === 'categories' ? 'Categoría creada' : 'Marca creada', 'success')
      }
      setEditing(null)
      fetchData()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (item, kind) => {
    if (!window.confirm(`¿Eliminar "${item.name}"? Los productos se mantendrán sin categoría/marca.`)) return
    try {
      await api.delete(`/api/admin/${kind}/${item.id}`)
      toast('Eliminado', 'success')
      fetchData()
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  const toggle = async (item, kind) => {
    try {
      await api.put(`/api/admin/${kind}/${item.id}`, { is_active: !item.is_active })
      toast('Estado actualizado', 'success')
      fetchData()
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  const list = tab === 'categories' ? categories : brands
  const base = tab === 'categories' ? 'categories' : 'brands'
  const EMPTY = tab === 'categories' ? EMPTY_CAT : EMPTY_BRAND

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h1 className="admin-page-title">Catálogo</h1>
          <p className="admin-page-sub">Categorías y marcas para organizar tu tienda.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing({ ...EMPTY })}>
          <Plus size={17} /> Nuevo
        </button>
      </div>

      <div className="admin-tabs">
        <button className={tab === 'categories' ? 'active' : ''} onClick={() => setTab('categories')}>
          Categorías ({categories.length})
        </button>
        <button className={tab === 'brands' ? 'active' : ''} onClick={() => setTab('brands')}>
          Marcas ({brands.length})
        </button>
      </div>

      {loading ? (
        <PageLoader />
      ) : (
        <div className="admin-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Slug</th>
                <th>Productos</th>
                <th>Orden</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {list.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="admin-cell-product">
                      {item.image ? <img src={item.image} alt="" /> : item.logo ? <img src={item.logo} alt="" /> : <span className="admin-img-ph" />}
                      <div>
                        <strong>{item.name}</strong>
                        <small>{item.description || '—'}</small>
                      </div>
                    </div>
                  </td>
                  <td>{item.slug}</td>
                  <td>{item.product_count ?? '—'}</td>
                  <td>{item.sort_order}</td>
                  <td>
                    <span className={`badge ${item.is_active ? 'badge-success' : 'badge-gray'}`}>
                      {item.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <div className="admin-row-actions">
                      <button className="btn-icon" onClick={() => toggle(item, base)} title="Activar/Desactivar">
                        <span className={`dot-toggle ${item.is_active ? 'on' : ''}`} />
                      </button>
                      <button className="btn-icon" onClick={() => setEditing({ ...item, sort_order: String(item.sort_order || 0) })} title="Editar"><Pencil size={16} /></button>
                      <button className="btn-icon danger" onClick={() => remove(item, base)} title="Eliminar"><Trash2 size={16} /></button>
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
              <h2>{editing.id ? 'Editar' : 'Nuevo'}</h2>
              <button className="btn-icon" onClick={() => setEditing(null)}><X size={20} /></button>
            </div>
            <div className="admin-modal-scroll">
              <div className="field">
                <label>Nombre *</label>
                <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div className="field">
                <label>Slug</label>
                <input value={editing.slug || ''} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} />
              </div>
              <div className="field">
                <label>{tab === 'categories' ? 'Imagen (URL)' : 'Logo (URL)'}</label>
                <input
                  value={editing.image || editing.logo || ''}
                  onChange={(e) => setEditing(tab === 'categories'
                    ? { ...editing, image: e.target.value }
                    : { ...editing, logo: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Descripción</label>
                <textarea rows={3} value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>
              <div className="field">
                <label>Orden</label>
                <input type="number" value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: e.target.value })} />
              </div>
              <label className="checkbox-row">
                <input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />
                Activo
              </label>
            </div>
            <div className="admin-modal-foot">
              <button className="btn btn-outline" onClick={() => setEditing(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
