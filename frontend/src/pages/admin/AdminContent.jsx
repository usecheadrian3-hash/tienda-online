import { useCallback, useEffect, useState } from 'react'
import { Pencil, Plus, Star, Trash2, X } from 'lucide-react'
import api from '../../services/api'
import { useToast } from '../../contexts/ToastContext'
import { formatDate, formatDateTime } from '../../utils/format'
import { PageLoader } from '../../components/ui/Loaders'

const EMPTY_PROMO = { title: '', subtitle: '', image: '', link: '', badge: '', discount_percent: '', expires_at: '', is_active: true, position: '0' }
const EMPTY_BANNER = { text: '', link: '', position: 'top', is_active: true, sort_order: '0' }
const EMPTY_POST = { title: '', excerpt: '', content: '', cover_image: '', category: '', tags: '', status: 'draft' }

export default function AdminContent() {
  const { toast } = useToast()
  const [tab, setTab] = useState('promos')
  const [loading, setLoading] = useState(true)
  const [promos, setPromos] = useState([])
  const [banners, setBanners] = useState([])
  const [posts, setPosts] = useState([])
  const [subs, setSubs] = useState([])
  const [reviews, setReviews] = useState([])
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  const fetchAll = useCallback(async () => {
    try {
      const [p, b, postsRes, subsRes, revs] = await Promise.all([
        api.get('/api/admin/promotions'),
        api.get('/api/admin/banners'),
        api.get('/api/admin/blog'),
        api.get('/api/admin/newsletter'),
        api.get('/api/admin/reviews'),
      ])
      setPromos(p.data)
      setBanners(b.data)
      setPosts(postsRes.data)
      setSubs(subsRes.data)
      setReviews(revs.data)
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchAll() }, [fetchAll])

  const save = async () => {
    const payload = { ...editing }
    let endpoint = ''
    let kind = ''
    if (tab === 'promos') {
      endpoint = 'promotions'
      kind = 'promoción'
      if (!payload.title.trim()) { toast('Título requerido', 'error'); return }
      payload.discount_percent = payload.discount_percent ? parseInt(payload.discount_percent, 10) : null
      payload.position = parseInt(payload.position || '0', 10)
    } else if (tab === 'banners') {
      endpoint = 'banners'
      kind = 'banner'
      if (!payload.text.trim()) { toast('Texto requerido', 'error'); return }
      payload.sort_order = parseInt(payload.sort_order || '0', 10)
    } else {
      endpoint = 'blog'
      kind = 'artículo'
      if (!payload.title.trim()) { toast('Título requerido', 'error'); return }
      payload.tags = payload.tags ? payload.tags.split(',').map((s) => s.trim()).filter(Boolean) : []
    }
    setSaving(true)
    try {
      if (editing.id) {
        await api.put(`/api/admin/${endpoint}/${editing.id}`, payload)
        toast(`${kind.charAt(0).toUpperCase()}${kind.slice(1)} actualizado`, 'success')
      } else {
        await api.post(`/api/admin/${endpoint}`, payload)
        toast(`${kind.charAt(0).toUpperCase()}${kind.slice(1)} creado`, 'success')
      }
      setEditing(null)
      fetchAll()
    } catch (e) {
      toast(e.errors ? Object.values(e.errors)[0] : e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (endpoint, label) => {
    if (!window.confirm(`¿Eliminar ${label}?`)) return
    try {
      await api.delete(endpoint)
      toast('Eliminado', 'success')
      fetchAll()
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  const toggleReview = async (r) => {
    try {
      await api.put(`/api/admin/reviews/${r.id}`, { is_approved: !r.is_approved })
      toast(r.is_approved ? 'Reseña ocultada' : 'Reseña aprobada', 'success')
      fetchAll()
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  const openNew = () => {
    if (tab === 'promos') setEditing({ ...EMPTY_PROMO })
    else if (tab === 'banners') setEditing({ ...EMPTY_BANNER })
    else if (tab === 'blog') setEditing({ ...EMPTY_POST })
  }

  const openEdit = (item) => {
    if (tab === 'promos') setEditing({ ...item, discount_percent: item.discount_percent ?? '', position: String(item.position || 0) })
    else if (tab === 'banners') setEditing({ ...item, sort_order: String(item.sort_order || 0) })
    else if (tab === 'blog') setEditing({ ...item, tags: (item.tags || []).join(', ') })
  }

  const modalTitle = tab === 'promos' ? (editing?.id ? 'Editar promoción' : 'Nueva promoción')
    : tab === 'banners' ? (editing?.id ? 'Editar banner' : 'Nuevo banner')
    : (editing?.id ? 'Editar artículo' : 'Nuevo artículo')

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h1 className="admin-page-title">Contenido</h1>
          <p className="admin-page-sub">Promociones, banners, blog, newsletter y reseñas.</p>
        </div>
        {tab !== 'newsletter' && tab !== 'reviews' && (
          <button className="btn btn-primary" onClick={openNew}>
            <Plus size={17} /> Nuevo
          </button>
        )}
      </div>

      <div className="admin-tabs">
        <button className={tab === 'promos' ? 'active' : ''} onClick={() => setTab('promos')}>Promociones</button>
        <button className={tab === 'banners' ? 'active' : ''} onClick={() => setTab('banners')}>Banners</button>
        <button className={tab === 'blog' ? 'active' : ''} onClick={() => setTab('blog')}>Blog ({posts.length})</button>
        <button className={tab === 'newsletter' ? 'active' : ''} onClick={() => setTab('newsletter')}>Newsletter ({subs.length})</button>
        <button className={tab === 'reviews' ? 'active' : ''} onClick={() => setTab('reviews')}>Reseñas ({reviews.length})</button>
      </div>

      {loading ? (
        <PageLoader />
      ) : (
        <div className="admin-card">
          {tab === 'promos' && (
            <table className="admin-table">
              <thead>
                <tr><th>Título</th><th>Descuento</th><th>Vence</th><th>Estado</th><th style={{ textAlign: 'right' }}>Acciones</th></tr>
              </thead>
              <tbody>
                {promos.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.title}</strong>
                      {p.subtitle && <br />}
                      {p.subtitle && <small>{p.subtitle}</small>}
                    </td>
                    <td>{p.discount_percent != null ? `${p.discount_percent}%` : '—'}</td>
                    <td>{p.expires_at ? formatDate(p.expires_at) : 'Sin vencimiento'}</td>
                    <td><span className={`badge ${p.is_active ? 'badge-success' : 'badge-gray'}`}>{p.is_active ? 'Activo' : 'Inactivo'}</span></td>
                    <td>
                      <div className="admin-row-actions">
                        <button className="btn-icon" onClick={() => openEdit(p)}><Pencil size={16} /></button>
                        <button className="btn-icon danger" onClick={() => remove(`/api/admin/promotions/${p.id}`, 'la promoción')}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'banners' && (
            <table className="admin-table">
              <thead>
                <tr><th>Texto</th><th>Posición</th><th>Orden</th><th>Estado</th><th style={{ textAlign: 'right' }}>Acciones</th></tr>
              </thead>
              <tbody>
                {banners.map((b) => (
                  <tr key={b.id}>
                    <td><strong>{b.text}</strong></td>
                    <td><span className="badge badge-gray">{b.position}</span></td>
                    <td>{b.sort_order}</td>
                    <td><span className={`badge ${b.is_active ? 'badge-success' : 'badge-gray'}`}>{b.is_active ? 'Activo' : 'Inactivo'}</span></td>
                    <td>
                      <div className="admin-row-actions">
                        <button className="btn-icon" onClick={() => openEdit(b)}><Pencil size={16} /></button>
                        <button className="btn-icon danger" onClick={() => remove(`/api/admin/banners/${b.id}`, 'el banner')}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'blog' && (
            <table className="admin-table">
              <thead>
                <tr><th>Título</th><th>Categoría</th><th>Fecha</th><th>Estado</th><th style={{ textAlign: 'right' }}>Acciones</th></tr>
              </thead>
              <tbody>
                {posts.map((p) => (
                  <tr key={p.id}>
                    <td><strong>{p.title}</strong></td>
                    <td>{p.category || '—'}</td>
                    <td>{p.published_at ? formatDate(p.published_at) : '—'}</td>
                    <td><span className={`badge ${p.status === 'published' ? 'badge-success' : 'badge-warning'}`}>{p.status}</span></td>
                    <td>
                      <div className="admin-row-actions">
                        <button className="btn-icon" onClick={() => openEdit(p)}><Pencil size={16} /></button>
                        <button className="btn-icon danger" onClick={() => remove(`/api/admin/blog/${p.id}`, 'el artículo')}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'newsletter' && (
            <table className="admin-table">
              <thead>
                <tr><th>Email</th><th>Fecha</th><th>Estado</th><th style={{ textAlign: 'right' }}>Acciones</th></tr>
              </thead>
              <tbody>
                {subs.map((s) => (
                  <tr key={s.id}>
                    <td><strong>{s.email}</strong></td>
                    <td>{formatDate(s.created_at)}</td>
                    <td><span className={`badge ${s.is_active ? 'badge-success' : 'badge-gray'}`}>{s.is_active ? 'Suscrito' : 'Dado de baja'}</span></td>
                    <td>
                      <div className="admin-row-actions">
                        <button className="btn-icon danger" onClick={() => remove(`/api/admin/newsletter/${s.id}`, 'la suscripción')}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'reviews' && (
            <table className="admin-table">
              <thead>
                <tr><th>Producto</th><th>Cliente</th><th>Calificación</th><th>Comentario</th><th>Fecha</th><th>Estado</th><th style={{ textAlign: 'right' }}>Acciones</th></tr>
              </thead>
              <tbody>
                {reviews.map((r) => (
                  <tr key={r.id}>
                    <td><strong>{r.product_name || `Producto #${r.product_id}`}</strong></td>
                    <td>{r.user?.name || '—'}</td>
                    <td>
                      <span className="stars-inline">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} size={13} fill={i < r.rating ? 'currentColor' : 'none'} color={i < r.rating ? '#FF5A3C' : '#d5d5d5'} />
                        ))}
                      </span>
                    </td>
                    <td>{r.comment ? String(r.comment).slice(0, 80) : '—'}</td>
                    <td>{formatDateTime(r.created_at)}</td>
                    <td><span className={`badge ${r.is_approved ? 'badge-success' : 'badge-warning'}`}>{r.is_approved ? 'Aprobada' : 'Pendiente'}</span></td>
                    <td>
                      <div className="admin-row-actions">
                        <button className="btn-icon" onClick={() => toggleReview(r)} title={r.is_approved ? 'Ocultar' : 'Aprobar'}>
                          <span className={`dot-toggle ${r.is_approved ? 'on' : ''}`} />
                        </button>
                        <button className="btn-icon danger" onClick={() => remove(`/api/admin/reviews/${r.id}`, 'la reseña')}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {editing && (
        <div className="admin-modal">
          <div className="admin-modal-backdrop" onClick={() => setEditing(null)} />
          <div className="admin-modal-body admin-modal-lg">
            <div className="admin-modal-head">
              <h2>{modalTitle}</h2>
              <button className="btn-icon" onClick={() => setEditing(null)}><X size={20} /></button>
            </div>
            <div className="admin-modal-scroll">
              {tab === 'promos' && (
                <>
                  <div className="field"><label>Título *</label><input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
                  <div className="field"><label>Subtítulo</label><input value={editing.subtitle || ''} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} /></div>
                  <div className="field-grid">
                    <div className="field"><label>Badge</label><input value={editing.badge || ''} onChange={(e) => setEditing({ ...editing, badge: e.target.value })} placeholder="Hasta -30%" /></div>
                    <div className="field"><label>Descuento (%)</label><input type="number" value={editing.discount_percent || ''} onChange={(e) => setEditing({ ...editing, discount_percent: e.target.value })} /></div>
                  </div>
                  <div className="field"><label>Imagen (URL)</label><input value={editing.image || ''} onChange={(e) => setEditing({ ...editing, image: e.target.value })} /></div>
                  <div className="field"><label>Enlace</label><input value={editing.link || ''} onChange={(e) => setEditing({ ...editing, link: e.target.value })} placeholder="/tienda" /></div>
                  <div className="field-grid">
                    <div className="field"><label>Vence</label><input type="datetime-local" value={editing.expires_at ? editing.expires_at.slice(0, 16) : ''} onChange={(e) => setEditing({ ...editing, expires_at: e.target.value || '' })} /></div>
                    <div className="field"><label>Posición</label><input type="number" value={editing.position} onChange={(e) => setEditing({ ...editing, position: e.target.value })} /></div>
                  </div>
                  <label className="checkbox-row"><input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />Activo</label>
                </>
              )}

              {tab === 'banners' && (
                <>
                  <div className="field"><label>Texto *</label><input value={editing.text} onChange={(e) => setEditing({ ...editing, text: e.target.value })} /></div>
                  <div className="field"><label>Enlace</label><input value={editing.link || ''} onChange={(e) => setEditing({ ...editing, link: e.target.value })} /></div>
                  <div className="field-grid">
                    <div className="field">
                      <label>Posición</label>
                      <select value={editing.position} onChange={(e) => setEditing({ ...editing, position: e.target.value })}>
                        <option value="top">Superior</option>
                        <option value="hero">Hero</option>
                        <option value="middle">Medio</option>
                      </select>
                    </div>
                    <div className="field"><label>Orden</label><input type="number" value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: e.target.value })} /></div>
                  </div>
                  <label className="checkbox-row"><input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />Activo</label>
                </>
              )}

              {tab === 'blog' && (
                <>
                  <div className="field"><label>Título *</label><input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
                  <div className="field"><label>Extracto</label><textarea rows={2} value={editing.excerpt || ''} onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })} /></div>
                  <div className="field"><label>Contenido</label><textarea rows={10} value={editing.content || ''} onChange={(e) => setEditing({ ...editing, content: e.target.value })} /></div>
                  <div className="field-grid">
                    <div className="field"><label>Categoría</label><input value={editing.category || ''} onChange={(e) => setEditing({ ...editing, category: e.target.value })} /></div>
                    <div className="field"><label>Tags (coma)</label><input value={editing.tags || ''} onChange={(e) => setEditing({ ...editing, tags: e.target.value })} /></div>
                  </div>
                  <div className="field"><label>Imagen de portada (URL)</label><input value={editing.cover_image || ''} onChange={(e) => setEditing({ ...editing, cover_image: e.target.value })} /></div>
                  <div className="field">
                    <label>Estado</label>
                    <select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                      <option value="draft">Borrador</option>
                      <option value="published">Publicado</option>
                    </select>
                  </div>
                </>
              )}
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
