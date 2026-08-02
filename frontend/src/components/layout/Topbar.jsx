import { Link } from 'react-router-dom'
import { ShieldCheck, Truck } from 'lucide-react'
import { useStore } from '../../contexts/StoreContext'

export default function Topbar({ banner }) {
  const { storeName } = useStore()

  return (
    <div className="topbar">
      <div className="container">
        <div className="topbar-inner">
          <div className="topbar-text">
            <Truck size={15} />
            {banner?.text || (
              <span>
                Envío gratis en compras superiores a <strong>$300.000</strong> ·{' '}
                <span className="topbar-link">{storeName}</span>
              </span>
            )}
            <span className="topbar-dot" />
          </div>
          <div className="topbar-right">
            <Link to="/blog">Blog</Link>
            <Link to="/contacto">Ayuda</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export function TrustBar() {
  const items = [
    { icon: Truck, title: 'Envío en 24h', sub: 'A toda Colombia' },
    { icon: ShieldCheck, title: 'Pagos seguros', sub: 'PSE, tarjetas y más' },
    { icon: ShieldCheck, title: 'Garantía', sub: '30 días de devolución' },
    { icon: ShieldCheck, title: 'Atención 7 días', sub: 'Línea de soporte' },
  ]
  return (
    <div className="trust-bar">
      <div className="container">
        <div className="trust-grid">
          {items.map((it, i) => (
            <div className="trust-item" key={i}>
              <div className="t-icon">
                <it.icon size={22} />
              </div>
              <div>
                <strong>{it.title}</strong>
                <span>{it.sub}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
