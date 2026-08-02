import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import api from '../../services/api'
import { useToast } from '../../contexts/ToastContext'
import { formatPrice } from '../../utils/format'
import { PageLoader } from '../../components/ui/Loaders'

const EMPTY = {
  name: '', sku: '', category_id: '', brand_id: '', short_description: '', description: '',
  features: '', price: '', compare_at_price: '', cost: '', weight_kg: '0', stock: '0',
  stock_min: '5', tags: '', is_active: true, is_featured: false, is_new: false,
  is_best_seller: false, images: [], variants: [],
}

export default function AdminProducts() {
  const { toast } = useToast()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [categories, setCategories] = useState([])
  const [brands, setBrands] = useState([])
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    params.set('page', page)
    params.set('limit', '12')
    try {
      const res = await api.get(`/api/admin/products?${params.toString()}`)
      setData(res.data)
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [q, page, toast])

  useEffect(() => {
    setLoading(true)
    const t = setTimeout(fetchData, 350)
    return () => clearTimeout(t)
  }, [fetchData])

  useEffect(() => {
    ;(async () => {
      try {
        const [c, b] = await Promise.all([
          api.get('/api/admin/categories'),
          api.get('/api/admin/brands'),
        ])
        setCategories(c.data)
        setBrands(b.data)
      } catch (e) { /* noop */ }
    })()
  }, [])

  const toggle = async (p) => {
    try {
      await api.post(`/api/admin/products/${p.id}/toggle`)
      toast(p.is_active ? 'Producto desactivado' : 'Producto activado', 'success')
      fetchData()
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  const remove = async (p) => {
    if (!window.confirm(`¿Eliminar "${p.name}"?`)) return
    try {
      await api.delete(`/api/admin/products/${p.id}`)
      toast('Producto eliminado', 'success')
      fetchData()
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  const openCreate = () => setEditing({ ...EMPTY })
  const openEdit = (p) => {
    setEditing({
      ...p,
      price: p.price ?? '',
      compare_at_price: p.compare_at_price ?? '',
      cost: p.cost ?? '',
      weight_kg: p.weight_kg ?? '0',
      stock: p.stock ?? '0',
      stock_min: p.stock_min ?? '5',
      features: p.features?.join('\n') || '',
      tags: p.tags?.join(', ') || '',
      category_id: p.category_id || '',
      brand_id: p.brand_id || '',
      variants: p.variants || [],
    })
  }

  const save = async () => {
    if (!editing.name.trim() || !editing.sku.trim()) {
      toast('Nombre y SKU son requeridos', 'error')
      return
    }
    setSaving(true)
    const payload = {
      ...editing,
      features: editing.features ? editing.features.split('\n').map((s) => s.trim()).filter(Boolean) : [],
      tags: editing.tags ? editing.tags.split(',').map((s) => s.trim()).filter(Boolean) : [],
      images: editing.images,
      variants: editing.variants,
    }
    try {
      if (editing.id) {
        await api.put(`/api/admin/products/${editing.id}`, payload)
        toast('Producto actualizado', 'success')
      } else {
        await api.post('/api/admin/products', payload)
        toast('Producto creado', 'success')
      }
      setEditing(null)
      fetchData()
    } catch (e) {
      toast(e.errors ? Object.values(e.errors)[0] : e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const setField = (field, value) => setEditing((e) => ({ ...e, [field]: value }))
  const setImage = (i, url) => {
    const images = [...editing.images]
    images[i] = { url }
    setField('images', images)
  }
  const addImage = () => setField('images', [...editing.images, { url: '' }])
  const removeImage = (i) => setField('images', editing.images.filter((_, idx) => idx !== i))

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h1 className="admin-page-title">Productos</h1>
          <p className="admin-page-sub">Gestiona el catálogo de tu tienda.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={17} /> Nuevo producto
        </button>
      </div>

      <div className="admin-toolbar">
        <div className="admin-search">
          <Search size={17} />
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder="Buscar producto…" />
        </div>
      </div>

      {loading ? (
        <PageLoader />
      ) : (
        <>
          <div className="admin-card">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Precio</th>
                  <th>Stock</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data?.items?.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="admin-cell-product">
                        {p.primary_image ? (
                          <img src={p.primary_image} alt="" />
                        ) : (
                          <span className="admin-img-ph" />
                        )}
                        <div>
                          <strong>{p.name}</strong>
                          <small>{p.sku}</small>
                        </div>
                      </div>
                    </td>
                    <td>{formatPrice(p.price)}</td>
                    <td>
                      <span className={`badge ${p.stock <= 0 ? 'badge-danger' : p.stock <= p.stock_min ? 'badge-warning' : 'badge-success'}`}>
                        {p.stock}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${p.is_active ? 'badge-success' : 'badge-gray'}`}>
                        {p.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        <Link to={`/producto/${p.slug}`} className="btn-icon" title="Ver"><Eye size={16} /></Link>
                        <button className="btn-icon" onClick={() => toggle(p)} title="Activar/Desactivar">
                          <span className={`dot-toggle ${p.is_active ? 'on' : ''}`} />
                        </button>
                        <button className="btn-icon" onClick={() => openEdit(p)} title="Editar"><Pencil size={16} /></button>
                        <button className="btn-icon danger" onClick={() => remove(p)} title="Eliminar"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data?.pages > 1 && (
            <div className="pagination">
              {Array.from({ length: data.pages }).map((_, i) => (
                <button key={i} className={i + 1 === page ? 'active' : ''} onClick={() => setPage(i + 1)}>
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {editing && (
        <div className="admin-modal">
          <div className="admin-modal-backdrop" onClick={() => setEditing(null)} />
          <div className="admin-modal-body admin-modal-lg">
            <div className="admin-modal-head">
              <h2>{editing.id ? 'Editar producto' : 'Nuevo producto'}</h2>
              <button className="btn-icon" onClick={() => setEditing(null)}><X size={20} /></button>
            </div>
            <div className="admin-modal-scroll">
              <div className="field-grid">
                <div className="field">
                  <label>Nombre *</label>
                  <input value={editing.name} onChange={(e) => setField('name', e.target.value)} />
                </div>
                <div className="field">
                  <label>SKU *</label>
                  <input value={editing.sku} onChange={(e) => setField('sku', e.target.value)} />
                </div>
              </div>
              <div className="field-grid">
                <div className="field">
                  <label>Categoría</label>
                  <select value={editing.category_id || ''} onChange={(e) => setField('category_id', e.target.value || '')}>
                    <option value="">Sin categoría</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Marca</label>
                  <select value={editing.brand_id || ''} onChange={(e) => setField('brand_id', e.target.value || '')}>
                    <option value="">Sin marca</option>
                    {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="field">
                <label>Descripción corta</label>
                <input value={editing.short_description || ''} onChange={(e) => setField('short_description', e.target.value)} />
              </div>
              <div className="field">
                <label>Descripción</label>
                <textarea rows={4} value={editing.description || ''} onChange={(e) => setField('description', e.target.value)} />
              </div>
              <div className="field">
                <label>Características (una por línea)</label>
                <textarea rows={3} value={editing.features || ''} onChange={(e) => setField('features', e.target.value)} />
              </div>
              <div className="field-grid">
                <div className="field"><label>Precio *</label><input type="number" value={editing.price} onChange={(e) => setField('price', e.target.value)} /></div>
                <div className="field"><label>Precio anterior</label><input type="number" value={editing.compare_at_price || ''} onChange={(e) => setField('compare_at_price', e.target.value)} /></div>
              </div>
              <div className="field-grid">
                <div className="field"><label>Costo</label><input type="number" value={editing.cost} onChange={(e) => setField('cost', e.target.value)} /></div>
                <div className="field"><label>Peso (kg)</label><input type="number" step="0.1" value={editing.weight_kg} onChange={(e) => setField('weight_kg', e.target.value)} /></div>
              </div>
              <div className="field-grid">
                <div className="field"><label>Stock</label><input type="number" value={editing.stock} onChange={(e) => setField('stock', e.target.value)} /></div>
                <div className="field"><label>Stock mínimo</label><input type="number" value={editing.stock_min} onChange={(e) => setField('stock_min', e.target.value)} /></div>
              </div>
              <div className="field">
                <label>Tags (separados por coma)</label>
                <input value={editing.tags || ''} onChange={(e) => setField('tags', e.target.value)} />
              </div>

              <div className="admin-subsection">
                <strong>Imágenes</strong>
                {editing.images.map((img, i) => (
                  <div className="admin-img-row" key={i}>
                    {img.url && <img src={img.url} alt="" />}
                    <input
                      value={img.url}
                      onChange={(e) => setImage(i, e.target.value)}
                      placeholder={i === 0 ? 'URL imagen principal' : `URL imagen ${i + 1}`}
                    />
                    <button className="btn-icon danger" onClick={() => removeImage(i)}><Trash2 size={15} /></button>
                  </div>
                ))}
                <button className="btn btn-outline btn-sm" onClick={addImage}>
                  <Plus size={15} /> Agregar imagen
                </button>
              </div>

              <div className="admin-subsection">
                <strong>Variantes</strong>
                {editing.variants.map((v, i) => (
                  <div className="admin-variant-row" key={i}>
                    <input value={v.name || ''} onChange={(e) => setVariant(i, 'name', e.target.value)} placeholder="Nombre (ej: Rojo M)" />
                    <input value={v.sku || ''} onChange={(e) => setVariant(i, 'sku', e.target.value)} placeholder="SKU" />
                    <input value={v.price ?? ''} onChange={(e) => setVariant(i, 'price', e.target.value)} placeholder="Precio" type="number" />
                    <input value={v.stock ?? ''} onChange={(e) => setVariant(i, 'stock', e.target.value)} placeholder="Stock" type="number" />
                    <button className="btn-icon danger" onClick={() => setField('variants', editing.variants.filter((_, idx) => idx !== i))}><X size={15} /></button>
                  </div>
                ))}
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => setField('variants', [...editing.variants, { name: '', sku: '', price: '', stock: '' }])}
                >
                  <Plus size={15} /> Agregar variante
                </button>
              </div>

              <div className="admin-checks">
                {[
                  ['is_active', 'Activo'],
                  ['is_featured', 'Destacado'],
                  ['is_new', 'Nuevo'],
                  ['is_best_seller', 'Más vendido'],
                ].map(([key, label]) => (
                  <label className="checkbox-row" key={key}>
                    <input type="checkbox" checked={!!editing[key]} onChange={(e) => setField(key, e.target.checked)} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div className="admin-modal-foot">
              <button className="btn btn-outline" onClick={() => setEditing(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar producto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  function setVariant(i, field, value) {
    const variants = [...editing.variants]
    variants[i] = { ...variants[i], [field]: value }
    setField('variants', variants)
  }
}
