import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Lock, Mail, Store } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

export default function Login() {
  const { login } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const from = location.state?.from?.pathname || '/cuenta'

  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const user = await login(form.email, form.password)
      toast('Bienvenido de nuevo', 'success')
      navigate(user?.is_admin && from === '/cuenta' ? '/admin' : from, { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

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
          “La <em>experiencia</em> de comprar, pensada para ti.”
        </p>
        <p style={{ fontSize: '.85rem', opacity: .6 }}>Productos seleccionados · Envíos a toda Colombia</p>
      </div>
      <div className="auth-form-wrap">
        <div className="auth-card">
          <h1>Iniciar sesión</h1>
          <p className="auth-sub">Accede a tu cuenta para seguir comprando.</p>
          {error && <div className="badge badge-danger" style={{ marginBottom: 16, width: '100%', justifyContent: 'center' }}>{error}</div>}
          <form onSubmit={onSubmit}>
            <div className="field">
              <label>Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={17} style={{ position: 'absolute', left: 14, top: 15, color: 'var(--gray-400)' }} />
                <input
                  type="email"
                  style={{ paddingLeft: 42 }}
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="tu@email.com"
                  required
                />
              </div>
            </div>
            <div className="field">
              <label>Contraseña</label>
              <div style={{ position: 'relative' }}>
                <Lock size={17} style={{ position: 'absolute', left: 14, top: 15, color: 'var(--gray-400)' }} />
                <input
                  type="password"
                  style={{ paddingLeft: 42 }}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>
          <div className="auth-alt">
            ¿No tienes cuenta? <Link to="/register">Crea una</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
