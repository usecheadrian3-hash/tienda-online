import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, Banknote, Check, CreditCard, Landmark,
  Lock, ShieldCheck, Smartphone, Truck, Wallet,
} from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { useStore } from '../contexts/StoreContext'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { formatPrice } from '../utils/format'
import Breadcrumb from '../components/ui/Breadcrumb'
import EmptyState from '../components/ui/EmptyState'

const STEPS = ['Datos', 'Envío', 'Pago', 'Confirmar']
const PAY_METHODS = [
  { id: 'pse', name: 'PSE — Transferencia', desc: 'Desde tu banco en Colombia', icon: Landmark },
  { id: 'card', name: 'Tarjeta crédito/débito', desc: 'Visa, Mastercard, Amex', icon: CreditCard },
  { id: 'bancolombia', name: 'Bancolombia', desc: 'Transferencia a tu cuenta', icon: Banknote },
]

export default function Checkout() {
  const { items, count, subtotal, loading } = useCart()
  const { symbol, currency, shippingMethods, taxRate, taxName, freeShipping } = useStore()
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [form, setForm] = useState(() => {
    try {
      return (
        JSON.parse(localStorage.getItem('checkout_form')) || {
          first_name: user?.name?.split(' ')[0] || '',
          last_name: user?.name?.split(' ').slice(1).join(' ') || '',
          email: user?.email || '',
          phone: user?.phone || '',
          address: '',
          city: '',
          state: '',
          postal_code: '',
          country: 'Colombia',
        }
      )
    } catch (e) {
      return {}
    }
  })
  const [shippingMethod, setShippingMethod] = useState('')
  const [payMethod, setPayMethod] = useState('')
  const [couponCode, setCouponCode] = useState('')
  const [coupon, setCoupon] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [orderResult, setOrderResult] = useState(null)

  useEffect(() => {
    localStorage.setItem('checkout_form', JSON.stringify(form))
  }, [form])

  useEffect(() => {
    if (user?.name && !form.first_name) {
      setForm((f) => ({
        ...f,
        first_name: user.name?.split(' ')[0] || '',
        last_name: user.name?.split(' ').slice(1).join(' ') || '',
        email: user.email || '',
        phone: user.phone || '',
      }))
    }
  }, [user, form.first_name])

  const availableMethods = useMemo(
    () => shippingMethods.filter((m) => m.active && !m.min_subtotal || (m.min_subtotal && subtotal >= m.min_subtotal)),
    [shippingMethods, subtotal],
  )

  const shipping = availableMethods.find((m) => m.id === shippingMethod)
  const shippingCost = shipping?.cost || 0
  const discount = coupon?.discount || 0
  const taxable = subtotal - discount
  const taxAmount = taxRate ? Math.round(taxable * (taxRate / 100)) : 0
  const total = subtotal - discount + shippingCost + taxAmount

  if (loading) {
    return (
      <div className="container">
        <div className="page-loader">Cargando…</div>
      </div>
    )
  }

  if (!items.length && !orderResult) {
    return (
      <div className="container">
        <EmptyState
          title="Tu carrito está vacío"
          subtitle="No hay productos para comprar."
          action={{ to: '/tienda', label: 'Explorar tienda' }}
        />
      </div>
    )
  }

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const validateStep = () => {
    const errs = {}
    if (step === 1) {
      if (!form.first_name?.trim()) errs.first_name = 'Requerido'
      if (!form.last_name?.trim()) errs.last_name = 'Requerido'
      if (!/^\S+@\S+\.\S+$/.test(form.email || '')) errs.email = 'Email inválido'
      if (!form.address?.trim()) errs.address = 'Requerido'
      if (!form.city?.trim()) errs.city = 'Requerido'
    } else if (step === 2) {
      if (!shippingMethod) errs.shipping = 'Selecciona un método de envío'
    } else if (step === 3) {
      if (!payMethod) errs.payment = 'Selecciona un método de pago'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const next = () => {
    if (!validateStep()) {
      toast('Revisa los campos marcados', 'error')
      return
    }
    setStep((s) => Math.min(s + 1, 4))
  }

  const back = () => setStep((s) => Math.max(s - 1, 1))

  const validateCoupon = async (e) => {
    e.preventDefault()
    if (!couponCode.trim()) return
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode, subtotal }),
      })
      const payload = await res.json()
      if (payload.ok) {
        setCoupon(payload.data)
        toast(payload.message, 'success')
      } else {
        setCoupon(null)
        toast(payload.message, 'error')
      }
    } catch (err) {
      toast('Error al validar cupón', 'error')
    }
  }

  const placeOrder = async () => {
    setSubmitting(true)
    try {
      // 1. Crear pedido
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('tienda_token')}`,
          'X-Cart-Token': localStorage.getItem('tienda_cart_token'),
        },
        body: JSON.stringify({
          ...form,
          shipping_method: shippingMethod,
          coupon_code: coupon?.code || '',
        }),
      })
      const payload = await res.json()
      if (!payload.ok) {
        toast(payload.message, 'error')
        setSubmitting(false)
        return
      }
      const order = payload.data.order
      setOrderResult({ order, totals: payload.data.totals })

      // 2. Iniciar pago
      const payRes = await fetch(`/api/payments/${order.order_number}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('tienda_token')}`,
        },
        body: JSON.stringify({ method: payMethod === 'test' ? 'test' : payMethod }),
      })
      const payPayload = await payRes.json()
      if (!payPayload.ok) {
        navigate(`/pedido/pendiente?order=${order.order_number}`)
        return
      }
      localStorage.removeItem('checkout_form')

      // 3. Redirigir a la pasarela
      if (payPayload.data.payment_url) {
        window.location.href = payPayload.data.payment_url
      } else {
        navigate(`/pedido/pendiente?order=${order.order_number}&ref=${payPayload.data.reference}`)
      }
    } catch (err) {
      toast('Error al procesar el pedido', 'error')
      setSubmitting(false)
    }
  }

  return (
    <div className="container">
      <Breadcrumb items={[{ label: 'Checkout' }]} />

      {!orderResult && (
        <div className="checkout-steps">
          {STEPS.map((label, i) => {
            const n = i + 1
            return (
              <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span className={`co-step ${n === step ? 'active' : ''} ${n < step ? 'done' : ''}`}>
                  <span className="co-num">{n < step ? <Check size={13} /> : n}</span>
                  {label}
                </span>
                {n < STEPS.length && <span className={`co-step-line ${n < step ? 'done' : ''}`} />}
              </span>
            )
          })}
        </div>
      )}

      <div className="checkout-layout">
        <div>
          {step === 1 && !orderResult && (
            <div className="checkout-card">
              <h3>
                <span className="co-num-big">1</span> Datos de contacto y envío
              </h3>
              <div className="field-grid">
                <div className={`field ${errors.first_name ? 'has-error' : ''}`}>
                  <label>Nombre</label>
                  <input value={form.first_name || ''} onChange={set('first_name')} placeholder="Nombre" />
                  {errors.first_name && <span className="error">{errors.first_name}</span>}
                </div>
                <div className={`field ${errors.last_name ? 'has-error' : ''}`}>
                  <label>Apellido</label>
                  <input value={form.last_name || ''} onChange={set('last_name')} placeholder="Apellido" />
                  {errors.last_name && <span className="error">{errors.last_name}</span>}
                </div>
              </div>
              <div className="field-grid">
                <div className={`field ${errors.email ? 'has-error' : ''}`}>
                  <label>Email</label>
                  <input type="email" value={form.email || ''} onChange={set('email')} placeholder="tu@email.com" />
                  {errors.email && <span className="error">{errors.email}</span>}
                </div>
                <div className="field">
                  <label>Teléfono</label>
                  <input value={form.phone || ''} onChange={set('phone')} placeholder="300 123 4567" />
                </div>
              </div>
              <div className={`field ${errors.address ? 'has-error' : ''}`}>
                <label>Dirección</label>
                <input value={form.address || ''} onChange={set('address')} placeholder="Calle 123 # 45-67" />
                {errors.address && <span className="error">{errors.address}</span>}
              </div>
              <div className="field-grid">
                <div className={`field ${errors.city ? 'has-error' : ''}`}>
                  <label>Ciudad</label>
                  <input value={form.city || ''} onChange={set('city')} placeholder="Bogotá" />
                  {errors.city && <span className="error">{errors.city}</span>}
                </div>
                <div className="field">
                  <label>Departamento</label>
                  <input value={form.state || ''} onChange={set('state')} placeholder="Cundinamarca" />
                </div>
              </div>
              <div className="field-grid">
                <div className="field">
                  <label>Código postal</label>
                  <input value={form.postal_code || ''} onChange={set('postal_code')} placeholder="110111" />
                </div>
                <div className="field">
                  <label>País</label>
                  <select value={form.country || 'Colombia'} onChange={set('country')}>
                    <option>Colombia</option>
                  </select>
                </div>
              </div>
              <button className="btn btn-primary" onClick={next}>
                Continuar con el envío <ArrowRight size={17} />
              </button>
            </div>
          )}

          {step === 2 && !orderResult && (
            <div className="checkout-card">
              <h3>
                <span className="co-num-big">2</span> Método de envío
              </h3>
              {errors.shipping && <p className="error" style={{ color: 'var(--danger)' }}>{errors.shipping}</p>}
              {availableMethods.map((m) => (
                <label key={m.id} className={`ship-option ${shippingMethod === m.id ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="shipping"
                    checked={shippingMethod === m.id}
                    onChange={() => setShippingMethod(m.id)}
                  />
                  <div className="so-info">
                    <div className="so-name">{m.name}</div>
                    <div className="so-days">Entrega en {m.days}</div>
                  </div>
                  <div className="so-price">
                    {m.cost === 0 ? 'Gratis' : formatPrice(m.cost, symbol, currency)}
                  </div>
                </label>
              ))}
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-outline" onClick={back}>
                  <ArrowLeft size={16} /> Volver
                </button>
                <button className="btn btn-primary" onClick={next}>
                  Continuar con el pago <ArrowRight size={17} />
                </button>
              </div>
            </div>
          )}

          {step === 3 && !orderResult && (
            <div className="checkout-card">
              <h3>
                <span className="co-num-big">3</span> Método de pago
              </h3>
              {errors.payment && <p className="error" style={{ color: 'var(--danger)' }}>{errors.payment}</p>}
              {PAY_METHODS.map((m) => (
                <label key={m.id} className={`pay-option ${payMethod === m.id ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="payment"
                    checked={payMethod === m.id}
                    onChange={() => setPayMethod(m.id)}
                  />
                  <div className="po-icon">
                    <m.icon size={20} />
                  </div>
                  <div className="po-info">
                    <div className="po-name">{m.name}</div>
                    <div className="po-desc">{m.desc}</div>
                  </div>
                  {payMethod === m.id && <span className="po-check"><Check size={18} /></span>}
                </label>
              ))}
              <div className="pay-option" style={{ opacity: 0.7, cursor: 'default' }}>
                <div className="po-icon"><Wallet size={20} /></div>
                <div className="po-info">
                  <div className="po-name">Nequi / Daviplata</div>
                  <div className="po-desc">Próximamente</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-outline" onClick={back}>
                  <ArrowLeft size={16} /> Volver
                </button>
                <button className="btn btn-primary" onClick={next}>
                  Revisar pedido <ArrowRight size={17} />
                </button>
              </div>
            </div>
          )}

          {step === 4 && !orderResult && (
            <div className="checkout-card">
              <h3>
                <span className="co-num-big">4</span> Confirma tu pedido
              </h3>
              {items.map((it) => (
                <div className="co-review-line" key={it.id}>
                  <div className="cr-left">
                    {it.product?.image && <img src={it.product.image} alt={it.product.name} />}
                    <div>
                      <strong style={{ fontSize: '.9rem' }}>{it.product?.name}</strong>
                      {it.variant?.name && <div className="cr-variant">{it.variant.name}</div>}
                      <div className="cr-variant">Cantidad: {it.quantity}</div>
                    </div>
                  </div>
                  <strong>{formatPrice(it.subtotal, symbol, currency)}</strong>
                </div>
              ))}
              <div style={{ borderTop: '1px solid var(--gray-100)', margin: '12px 0' }} />
              <div className="co-review-line"><span>Envío</span><strong>{shipping?.name}</strong></div>
              <div className="co-review-line">
                <span>Pago</span>
                <strong>{PAY_METHODS.find((m) => m.id === payMethod)?.name}</strong>
              </div>
              <button className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 16 }} onClick={placeOrder} disabled={submitting}>
                <Lock size={17} /> {submitting ? 'Procesando…' : `Pagar ${formatPrice(total, symbol, currency)}`}
              </button>
              <div className="co-secure-note">
                <ShieldCheck size={15} /> Tus datos están protegidos. No almacenamos información de tarjetas.
              </div>
            </div>
          )}
        </div>

        <aside className="order-summary">
          <h3>Resumen</h3>
          {items.map((it) => (
            <div className="os-row" key={it.id} style={{ fontSize: '.86rem' }}>
              <span>
                {it.product?.name}
                {it.quantity > 1 && <span className="text-xs" style={{ color: 'var(--gray-400)' }}> ×{it.quantity}</span>}
              </span>
              <strong>{formatPrice(it.subtotal, symbol, currency)}</strong>
            </div>
          ))}
          <form className="coupon-box" onSubmit={validateCoupon}>
            <input value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="Cupón" disabled={!!coupon} />
            <button className="btn btn-outline" disabled={!!coupon}>
              {coupon ? <Check size={16} /> : 'OK'}
            </button>
          </form>
          {coupon && (
            <div className="coupon-applied">
              <span>{coupon.code} -{formatPrice(discount, symbol, currency)}</span>
              <button onClick={() => setCoupon(null)}>Quitar</button>
            </div>
          )}
          <div className="os-row">
            <span>Subtotal</span>
            <strong>{formatPrice(subtotal, symbol, currency)}</strong>
          </div>
          {discount > 0 && (
            <div className="os-row" style={{ color: 'var(--success)' }}>
              <span>Descuento</span>
              <strong>-{formatPrice(discount, symbol, currency)}</strong>
            </div>
          )}
          <div className="os-row">
            <span>Envío</span>
            <strong>{shippingCost === 0 ? 'Gratis' : formatPrice(shippingCost, symbol, currency)}</strong>
          </div>
          {taxAmount > 0 && (
            <div className="os-row">
              <span>{taxName} ({taxRate}%)</span>
              <strong>{formatPrice(taxAmount, symbol, currency)}</strong>
            </div>
          )}
          <div className="os-total">
            <span>Total</span>
            <span>{formatPrice(total, symbol, currency)}</span>
          </div>
        </aside>
      </div>
    </div>
  )
}
