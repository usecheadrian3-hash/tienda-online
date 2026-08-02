import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Clock, ShieldAlert, XCircle, FileText } from 'lucide-react'
import { useStore } from '../contexts/StoreContext'
import { formatPrice } from '../utils/format'

const CONFIG = {
  exitoso: {
    icon: CheckCircle2,
    cls: 'success',
    title: '¡Pago exitoso!',
    subtitle: 'Tu pedido ha sido confirmado y está en preparación.',
  },
  pendiente: {
    icon: Clock,
    cls: 'warning',
    title: 'Pago en proceso',
    subtitle: 'Estamos confirmando tu pago. Esto puede tomar unos minutos.',
  },
  error: {
    icon: XCircle,
    cls: 'error',
    title: 'El pago no fue aprobado',
    subtitle: 'Tu pago fue rechazado o expiró. Inténtalo nuevamente o usa otro método.',
  },
  cancelado: {
    icon: AlertTriangle,
    cls: 'warning',
    title: 'Pago cancelado',
    subtitle: 'Cancelaste el proceso de pago. Puedes intentar nuevamente cuando quieras.',
  },
}

export default function OrderStatus({ status }) {
  const [searchParams] = useSearchParams()
  const order = searchParams.get('order')
  const ref = searchParams.get('ref')
  const { symbol, currency } = useStore()

  const cfg = CONFIG[status] || CONFIG.error
  const Icon = cfg.icon

  const [orderData, setOrderData] = useState(null)
  const [polling, setPolling] = useState(false)
  const [resultStatus, setResultStatus] = useState(status)

  // Polling para estado pendiente
  useEffect(() => {
    if (status !== 'pendiente' || !ref) return
    let stopped = false
    let attempts = 0
    setPolling(true)
    const timer = setInterval(async () => {
      attempts += 1
      if (attempts > 20 || stopped) {
        clearInterval(timer)
        setPolling(false)
        return
      }
      try {
        const res = await fetch(`/api/payments/status?reference=${encodeURIComponent(ref)}`)
        const payload = await res.json()
        if (payload.ok && payload.data?.status === 'approved') {
          clearInterval(timer)
          if (!stopped) {
            setResultStatus('exitoso')
            setPolling(false)
          }
        }
      } catch (e) {
        /* reintentar */
      }
    }, 4000)
    return () => {
      stopped = true
      clearInterval(timer)
    }
  }, [status, ref])

  useEffect(() => {
    if (!order) return
    fetch(`/api/orders/${order}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('tienda_token')}` },
    })
      .then((r) => r.json())
      .then((payload) => {
        if (payload.ok) setOrderData(payload.data)
      })
      .catch(() => {})
  }, [order])

  const finalCfg = CONFIG[resultStatus] || cfg
  const FinalIcon = finalCfg.icon

  return (
    <div className="container">
      <div className="status-page">
        <div className={`status-icon ${finalCfg.cls}`}>
          <FinalIcon />
        </div>
        <h1>{finalCfg.title}</h1>
        <p>{finalCfg.subtitle}</p>

        {polling && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, color: 'var(--gray-500)', fontSize: '.9rem' }}>
            <span className="spinner dark" /> Confirmando pago…
          </div>
        )}

        {orderData && (
          <div className="status-meta">
            <div className="status-meta-row">
              <span>Pedido</span>
              <strong>{orderData.order_number}</strong>
            </div>
            <div className="status-meta-row">
              <span>Total</span>
              <strong>{formatPrice(orderData.total, symbol, currency)}</strong>
            </div>
            <div className="status-meta-row">
              <span>Estado</span>
              <strong style={{ color: resultStatus === 'exitoso' ? 'var(--success)' : 'var(--warning)' }}>
                {resultStatus === 'exitoso' ? 'Pagado' : 'En proceso'}
              </strong>
            </div>
          </div>
        )}

        <div className="status-actions">
          {resultStatus === 'exitoso' ? (
            <>
              {orderData && (
                <a
                  href={`/api/orders/${order}/receipt.pdf`}
                  className="btn btn-primary"
                  target="_blank"
                  rel="noreferrer"
                >
                  <FileText size={17} /> Descargar comprobante
                </a>
              )}
              <Link to="/cuenta/pedidos" className="btn btn-outline">Ver mis pedidos</Link>
            </>
          ) : (
            <>
              {order && (
                <Link to="/carrito" className="btn btn-primary">
                  <ShieldAlert size={17} /> Reintentar pago
                </Link>
              )}
              <Link to="/tienda" className="btn btn-outline">Seguir comprando</Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
