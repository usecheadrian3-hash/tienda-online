import { useCallback, useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import api from '../../services/api'
import { useToast } from '../../contexts/ToastContext'
import { PageLoader } from '../../components/ui/Loaders'

const DEFAULT_SOCIAL = { facebook: '', instagram: '', twitter: '', tiktok: '', youtube: '' }

export default function AdminSettings() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(null)
  const [shipping, setShipping] = useState([])
  const [social, setSocial] = useState({ ...DEFAULT_SOCIAL })

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/api/admin/settings')
      const s = res.data
      setForm(s)
      try { setShipping(JSON.parse(s.shipping_methods || '[]')) } catch { setShipping([]) }
      try { setSocial({ ...DEFAULT_SOCIAL, ...JSON.parse(s.social || '{}') }) } catch { setSocial({ ...DEFAULT_SOCIAL }) }
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchData() }, [fetchData])

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const save = async () => {
    setSaving(true)
    const payload = {
      ...form,
      shipping_methods: JSON.stringify(shipping),
      social: JSON.stringify(social),
    }
    try {
      await api.put('/api/admin/settings', payload)
      toast('Configuración guardada', 'success')
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const setShip = (i, field, value) => {
    const next = shipping.map((m, idx) => (idx === i ? { ...m, [field]: value } : m))
    setShipping(next)
  }

  if (loading || !form) return <PageLoader />

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h1 className="admin-page-title">Configuración</h1>
          <p className="admin-page-sub">Branding, moneda, impuestos, envíos y contacto.</p>
        </div>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>

      <div className="admin-settings-grid">
        <div className="admin-card">
          <h3 className="admin-card-title">Branding</h3>
          <div className="field"><label>Nombre de la tienda</label><input value={form.store_name || ''} onChange={(e) => set('store_name', e.target.value)} /></div>
          <div className="field"><label>Eslogan</label><input value={form.store_tagline || ''} onChange={(e) => set('store_tagline', e.target.value)} /></div>
          <div className="field"><label>Logo (URL)</label><input value={form.store_logo || ''} onChange={(e) => set('store_logo', e.target.value)} /></div>
          <div className="field"><label>Favicon (URL)</label><input value={form.store_favicon || ''} onChange={(e) => set('store_favicon', e.target.value)} /></div>
        </div>

        <div className="admin-card">
          <h3 className="admin-card-title">Moneda e impuestos</h3>
          <div className="field-grid">
            <div className="field"><label>Moneda</label><input value={form.currency || ''} onChange={(e) => set('currency', e.target.value)} placeholder="COP" /></div>
            <div className="field"><label>Símbolo</label><input value={form.currency_symbol || ''} onChange={(e) => set('currency_symbol', e.target.value)} placeholder="$" /></div>
          </div>
          <div className="field-grid">
            <div className="field"><label>Impuesto (%)</label><input type="number" value={form.tax_rate || ''} onChange={(e) => set('tax_rate', e.target.value)} /></div>
            <div className="field"><label>Nombre del impuesto</label><input value={form.tax_name || ''} onChange={(e) => set('tax_name', e.target.value)} placeholder="IVA" /></div>
          </div>
          <label className="checkbox-row">
            <input type="checkbox" checked={String(form.tax_enabled) === 'true'} onChange={(e) => set('tax_enabled', String(e.target.checked))} />
            Aplicar impuestos
          </label>
        </div>

        <div className="admin-card">
          <h3 className="admin-card-title">Envíos</h3>
          <div className="field">
            <label>Envío gratis a partir de</label>
            <input type="number" value={form.free_shipping_threshold || ''} onChange={(e) => set('free_shipping_threshold', e.target.value)} />
          </div>
          <div className="admin-subsection">
            <strong>Métodos de envío</strong>
            {shipping.map((m, i) => (
              <div className="admin-ship-row" key={i}>
                <input value={m.name || ''} onChange={(e) => setShip(i, 'name', e.target.value)} placeholder="Nombre" />
                <input type="number" value={m.cost ?? ''} onChange={(e) => setShip(i, 'cost', parseFloat(e.target.value) || 0)} placeholder="Costo" />
                <input value={m.days || ''} onChange={(e) => setShip(i, 'days', e.target.value)} placeholder="Tiempo" />
                <input type="number" value={m.min_subtotal ?? ''} onChange={(e) => setShip(i, 'min_subtotal', parseFloat(e.target.value) || 0)} placeholder="Mínimo" title="Monto mínimo de compra" />
                <label className="checkbox-inline">
                  <input type="checkbox" checked={!!m.active} onChange={(e) => setShip(i, 'active', e.target.checked)} />
                  Activo
                </label>
                <button className="btn-icon danger" onClick={() => setShipping(shipping.filter((_, idx) => idx !== i))}><Trash2 size={15} /></button>
              </div>
            ))}
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setShipping([...shipping, { name: '', cost: 0, days: '', min_subtotal: 0, active: true }])}
            >
              <Plus size={15} /> Agregar método
            </button>
          </div>
        </div>

        <div className="admin-card">
          <h3 className="admin-card-title">Contacto</h3>
          <div className="field"><label>Email de soporte</label><input value={form.support_email || ''} onChange={(e) => set('support_email', e.target.value)} /></div>
          <div className="field"><label>Teléfono</label><input value={form.support_phone || ''} onChange={(e) => set('support_phone', e.target.value)} /></div>
          <div className="field"><label>Dirección</label><input value={form.store_address || ''} onChange={(e) => set('store_address', e.target.value)} /></div>
          <div className="field"><label>Ciudad</label><input value={form.store_city || ''} onChange={(e) => set('store_city', e.target.value)} /></div>
        </div>

        <div className="admin-card">
          <h3 className="admin-card-title">Redes sociales</h3>
          {Object.keys(DEFAULT_SOCIAL).map((k) => (
            <div className="field" key={k}>
              <label className="capitalize">{k}</label>
              <input value={social[k] || ''} onChange={(e) => setSocial({ ...social, [k]: e.target.value })} />
            </div>
          ))}
        </div>

        <div className="admin-card">
          <h3 className="admin-card-title">Página de inicio y SEO</h3>
          <div className="field"><label>Título hero</label><input value={form.hero_title || ''} onChange={(e) => set('hero_title', e.target.value)} /></div>
          <div className="field"><label>Subtítulo hero</label><input value={form.hero_subtitle || ''} onChange={(e) => set('hero_subtitle', e.target.value)} /></div>
          <div className="field"><label>SEO title</label><input value={form.seo_title || ''} onChange={(e) => set('seo_title', e.target.value)} /></div>
          <div className="field"><label>SEO description</label><textarea rows={3} value={form.seo_description || ''} onChange={(e) => set('seo_description', e.target.value)} /></div>
        </div>
      </div>

      <div className="admin-page-head" style={{ marginTop: 24 }}>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}
