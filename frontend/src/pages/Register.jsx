import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Phone, Store, User } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

export default function Register() {
  const { register } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})
    try {
      await register(form)
      toast('Cuenta creada correctamente', 'success')
      navigate('/cuenta')
    } catch (err) {
      setErrors(err.errors || {})
      if (!err.errors) toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  return (
    <div className="auth-layout">
      <div className="auth-side">
        <Link to="/" className="logo" style={{ position: 'relative', zIndex: 2 }}>
          <span className="logo-mark" style={{ background: 'rgba(255,255,255,.12)' }}>
            <Store size={22} />
          </span>
          <span className="logo-name" style={{ color: '#fff' }}>TIENDA<em>.</em></span>
        </Link>
        <p className="as-quote">
          “Únete y recibe <em>beneficios exclusivos</em>.”
        </p>
        <p style={{ fontSize: '.85rem', opacity: .6 }}>Descuentos · Envío gratis · Acceso anticipado</p>
      </div>
      <div className="auth-form-wrap">
        <div className="auth-card">
          <h1>Crear cuenta</h1>
          <p className="auth-sub">Regístrate en menos de un minuto.</p>
          <form onSubmit={onSubmit}>
            <div className={`field ${errors.name ? 'has-error' : ''}`}>
              <label>Nombre completo</label>
              <div style={{ position: 'relative' }}>
                <User size={17} style={{ position: 'absolute', left: 14, top: 15, color: 'var(--gray-400)' }} />
                <input style={{ paddingLeft: 42 }} value={form.name} onChange={set('name')} placeholder="Nombre y apellido" />
              </div>
              {errors.name && <span className="error">{errors.name}</span>}
            </div>
            <div className={`field ${errors.email ? 'has-error' : ''}`}>
              <label>Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={17} style={{ position: 'absolute', left: 14, top: 15, color: 'var(--gray-400)' }} />
                <input type="email" style={{ paddingLeft: 42 }} value={form.email} onChange={set('email')} placeholder="tu@email.com" />
              </div>
              {errors.email && <span className="error">{errors.email}</span>}
            </div>
            <div className={`field ${errors.phone ? 'has-error' : ''}`}>
              <label>Teléfono (opcional)</label>
              <div style={{ position: 'relative' }}>
                <Phone size={17} style={{ position: 'absolute', left: 14, top: 15, color: 'var(--gray-400)' }} />
                <input style={{ paddingLeft: 42 }} value={form.phone} onChange={set('phone')} placeholder="300 123 4567" />
              </div>
              {errors.phone && <span className="error">{errors.phone}</span>}
            </div>
            <div className={`field ${errors.password ? 'has-error' : ''}`}>
              <label>Contraseña</label>
              <input type="password" value={form.password} onChange={set('password')} placeholder="Mínimo 8 caracteres" />
              {errors.password && <span className="error">{errors.password}</span>}
            </div>
            <div className={`field ${errors.confirm_password ? 'has-error' : ''}`}>
              <label>Confirmar contraseña</label>
              <input type="password" value={form.confirm_password} onChange={set('confirm_password')} placeholder="Repite tu contraseña" />
              {errors.confirm_password && <span className="error">{errors.confirm_password}</span>}
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Creando cuenta…' : 'Crear cuenta'}
            </button>
          </form>
          <div className="auth-alt">
            ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
