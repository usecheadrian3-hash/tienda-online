import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Banknote, CreditCard, Landmark } from 'lucide-react'
import { useToast } from '../contexts/ToastContext'
import { useStore } from '../contexts/StoreContext'
import { formatPrice } from '../utils/format'
import { PageLoader } from '../components/ui/Loaders'

const METHODS = [
  { id: 'pse', name: 'PSE — Transferencia', icon: Landmark },
  { id: 'card', name: 'Tarjeta crédito/débito', icon: CreditCard },
  { id: 'bancolombia', name: 'Bancolombia', icon: Banknote },
]

export default function Payment() {
  const { orderNumber } = useParams()
  const { symbol, currency } = useStore()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [method, setMethod] = useState('')
  const [paying, setPaying] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch(`/api/orders/${orderNumber}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('tienda_token')}` },
        })
        const payload = await res.json()
        if (payload.ok) setOrder(payload.data)
      } catch (e) {
        /* noop */
      } finally {
        setLoading(false)
      }
    })()
  }, [orderNumber])

  const pay = async () => {
    if (!method) {
      toast('Selecciona un método de pago', 'error')
      return
    }
    setPaying(true)
    try {
      const res = await fetch(`/api/payments/${orderNumber}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('tienda_token')}`,
        },
        body: JSON.stringify({ method }),
      })
      const payload = await res.json()
      if (!payload.ok) {
        toast(payload.message, 'error')
        setPaying(false)
        return
      }
      if (payload.data.payment_url) {
        window.location.href = payload.data.payment_url
      } else if (payload.data.payment_status === 'approved') {
        navigate(`/pedido/exitoso?order=${orderNumber}`)
      } else {
        navigate(`/pedido/pendiente?order=${orderNumber}&ref=${payload.data.reference}`)
      }
    } catch (err) {
      toast('Error al iniciar el pago', 'error')
      setPaying(false)
    }
  }

  if (loading) return <PageLoader />
  if (!order) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: 64 }}>
        <h1>Pedido no encontrado</h1>
        <Link to="/cuenta/pedidos" className="btn btn-dark" style={{ marginTop: 20 }}>Mis pedidos</Link>
      </div>
    )
  }

  if (order.payment_status === 'approved') {
    return (
      <div className="container" style={{ textAlign: 'center', padding: 64 }}>
        <h1>Este pedido ya fue pagado</h1>
        <Link to={`/cuenta/pedidos/${orderNumber}`} className="btn btn-primary" style={{ marginTop: 20 }}>
          Ver pedido
        </Link>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="status-page">
        <h1>Completa tu pago</h1>
        <p>
          Pedido <strong>{order.order_number}</strong> · Total{' '}
          <strong>{formatPrice(order.total, symbol, currency)}</strong>
        </p>
        <div style={{ width: '100%', marginTop: 24 }}>
          {METHODS.map((m) => (
            <label key={m.id} className={`pay-option ${method === m.id ? 'active' : ''}`}>
              <input type="radio" name="payment" checked={method === m.id} onChange={() => setMethod(m.id)} />
              <div className="po-icon"><m.icon size={20} /></div>
              <div className="po-info">
                <div className="po-name">{m.name}</div>
              </div>
            </label>
          ))}
        </div>
        <div className="status-actions">
          <button className="btn btn-primary" onClick={pay} disabled={paying}>
            {paying ? 'Iniciando…' : 'Pagar ahora'}
          </button>
          <Link to={`/cuenta/pedidos/${orderNumber}`} className="btn btn-outline">Volver al pedido</Link>
        </div>
      </div>
    </div>
  )
}
