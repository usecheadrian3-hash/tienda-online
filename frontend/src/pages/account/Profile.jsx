import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import api from '../../services/api'

export default function Profile() {
  const { user, updateUser } = useAuth()
  const { toast } = useToast()
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '' })
  const [saving, setSaving] = useState(false)
  const [pw, setPw] = useState({ current_password: '', new_password: '', confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)

  const saveProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await api.put('/api/me', form)
      updateUser(res.data)
      toast('Perfil actualizado', 'success')
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const savePassword = async (e) => {
    e.preventDefault()
    if (pw.new_password !== pw.confirm) {
      toast('Las contraseñas no coinciden', 'error')
      return
    }
    setPwSaving(true)
    try {
      await api.put('/api/me/password', { current_password: pw.current_password, new_password: pw.new_password })
      toast('Contraseña actualizada', 'success')
      setPw({ current_password: '', new_password: '', confirm: '' })
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setPwSaving(false)
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 20 }}>Mi perfil</h1>
      <div className="checkout-card">
        <h3>Información personal</h3>
        <form onSubmit={saveProfile}>
          <div className="field">
            <label>Nombre completo</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="field-grid">
            <div className="field">
              <label>Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="field">
              <label>Teléfono</label>
              <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>
          <button className="btn btn-dark" disabled={saving}>{saving ? 'Guardando…' : 'Guardar cambios'}</button>
        </form>
      </div>

      <div className="checkout-card">
        <h3>Cambiar contraseña</h3>
        <form onSubmit={savePassword}>
          <div className="field">
            <label>Contraseña actual</label>
            <input type="password" value={pw.current_password} onChange={(e) => setPw((p) => ({ ...p, current_password: e.target.value }))} />
          </div>
          <div className="field-grid">
            <div className="field">
              <label>Nueva contraseña</label>
              <input type="password" value={pw.new_password} onChange={(e) => setPw((p) => ({ ...p, new_password: e.target.value }))} />
            </div>
            <div className="field">
              <label>Confirmar nueva</label>
              <input type="password" value={pw.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} />
            </div>
          </div>
          <button className="btn btn-outline" disabled={pwSaving}>{pwSaving ? 'Guardando…' : 'Actualizar contraseña'}</button>
        </form>
      </div>
    </div>
  )
}
