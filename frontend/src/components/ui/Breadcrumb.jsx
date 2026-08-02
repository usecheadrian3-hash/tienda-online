import { Link } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'

export default function Breadcrumb({ items = [] }) {
  if (!items.length) return null
  return (
    <nav className="breadcrumb" aria-label="Ruta">
      <Link to="/">
        <Home size={14} /> Inicio
      </Link>
      {items.map((it, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <ChevronRight size={13} />
          {it.to && i < items.length - 1 ? (
            <Link to={it.to}>{it.label}</Link>
          ) : (
            <span className="current">{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
