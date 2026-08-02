import { useState } from 'react'
import { Headset, Mail, MapPin, Phone } from 'lucide-react'
import { useStore } from '../contexts/StoreContext'
import { useToast } from '../contexts/ToastContext'
import Breadcrumb from '../components/ui/Breadcrumb'

export default function Contact() {
  const { config } = useStore()
  const { toast } = useToast()
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [sending, setSending] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setSending(true)
    // Enviar a soporte por email (mock). En producción conectar a email_service.
    setTimeout(() => {
      setSending(false)
      setForm({ name: '', email: '', message: '' })
      toast('Mensaje enviado. Te responderemos pronto.', 'success')
    }, 600)
  }

  return (
    <div className="container">
      <Breadcrumb items={[{ label: 'Contacto' }]} />
      <div className="checkout-layout" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 12 }}>Contáctanos</h1>
          <p className="text-muted" style={{ marginBottom: 24 }}>
            ¿Tienes dudas sobre un pedido, un producto o una devolución? Estamos aquí para ayudarte.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {config?.support_phone && (
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div className="po-icon"><Phone size={19} /></div>
                <div>
                  <strong>Teléfono</strong>
                  <div className="text-muted">{config.support_phone}</div>
                </div>
              </div>
            )}
            {config?.support_email && (
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div className="po-icon"><Mail size={19} /></div>
                <div>
                  <strong>Email</strong>
                  <div className="text-muted">{config.support_email}</div>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div className="po-icon"><MapPin size={19} /></div>
              <div>
                <strong>Ubicación</strong>
                <div className="text-muted">Colombia</div>
              </div>
            </div>
          </div>
        </div>
        <div className="checkout-card">
          <h3><span className="co-num-big"><Headset size={17} /></span> Envíanos un mensaje</h3>
          <form onSubmit={submit}>
            <div className="field">
              <label>Nombre</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="field">
              <label>Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
            </div>
            <div className="field">
              <label>Mensaje</label>
              <textarea rows={5} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} required />
            </div>
            <button className="btn btn-primary" disabled={sending}>
              {sending ? 'Enviando…' : 'Enviar mensaje'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
