import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CreditCard, Headset, MapPin, Mail, Phone } from 'lucide-react'
import { useStore } from '../../contexts/StoreContext'
import { useToast } from '../../contexts/ToastContext'

export default function Footer() {
  const { config, storeName } = useStore()
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)

  const socials = config?.social || {}
  const year = new Date().getFullYear()

  const subscribe = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setSending(true)
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const payload = await res.json()
      if (payload.ok) {
        toast(payload.message, 'success')
        setEmail('')
      } else {
        toast(payload.message, 'error')
      }
    } catch (err) {
      toast('Error al suscribirte', 'error')
    } finally {
      setSending(false)
    }
  }

  const socialLinks = [
    socials.facebook && { label: 'Facebook', href: socials.facebook },
    socials.instagram && { label: 'Instagram', href: socials.instagram },
    socials.tiktok && { label: 'TikTok', href: socials.tiktok },
    socials.twitter && { label: 'Twitter', href: socials.twitter },
    socials.youtube && { label: 'YouTube', href: socials.youtube },
  ].filter(Boolean)

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link to="/" className="logo">
              <span className="logo-mark" style={{ background: 'rgba(255,255,255,.1)' }}>
                <CreditCard size={20} />
              </span>
              <span className="logo-name" style={{ color: '#fff' }}>
                {storeName?.toUpperCase()}
              </span>
            </Link>
            <p>{config?.store_tagline}</p>
            <p>{config?.store_address}{config?.store_city ? ` · ${config.store_city}` : ''}</p>
            <div className="footer-social">
              {socialLinks.map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noreferrer" aria-label={s.label}>
                  {s.label.slice(0, 1)}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4>Tienda</h4>
            <ul>
              <li><Link to="/tienda">Todos los productos</Link></li>
              <li><Link to="/tienda?filter=nuevo">Novedades</Link></li>
              <li><Link to="/tienda?filter=venta">En oferta</Link></li>
              <li><Link to="/tienda?filter=destacado">Destacados</Link></li>
            </ul>
          </div>

          <div>
            <h4>Mi cuenta</h4>
            <ul>
              <li><Link to="/login">Iniciar sesión</Link></li>
              <li><Link to="/register">Crear cuenta</Link></li>
              <li><Link to="/cuenta/pedidos">Mis pedidos</Link></li>
              <li><Link to="/cuenta/favoritos">Favoritos</Link></li>
            </ul>
          </div>

          <div>
            <h4>Información</h4>
            <ul>
              <li><Link to="/blog">Blog</Link></li>
              <li><Link to="/contacto">Contacto</Link></li>
              <li><Link to="/terminos">Términos y condiciones</Link></li>
              <li><Link to="/privacidad">Política de privacidad</Link></li>
            </ul>
          </div>

          <div>
            <h4>Contacto</h4>
            <ul className="footer-contact">
              {config?.support_phone && (
                <li><Phone size={16} /> {config.support_phone}</li>
              )}
              {config?.support_email && (
                <li><Mail size={16} /> {config.support_email}</li>
              )}
              <li><MapPin size={16} /> Colombia</li>
            </ul>
            <form className="newsletter-form" onSubmit={subscribe}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Tu email"
                aria-label="Email para newsletter"
              />
              <button type="submit" disabled={sending}>
                {sending ? '…' : 'Suscribir'}
              </button>
            </form>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {year} {storeName}. Todos los derechos reservados.</span>
          <div className="payment-icons">
            <span>PSE</span>
            <span>VISA</span>
            <span>MC</span>
            <span>NEQUI</span>
            <span>DAVIPLATA</span>
          </div>
          <div className="legal">
            <Link to="/terminos">Términos</Link>
            <Link to="/privacidad">Privacidad</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
