import { Package, SearchX } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function EmptyState({ icon = Package, title = 'Sin resultados', subtitle = '', action = null }) {
  const Icon = icon
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Icon size={30} />
      </div>
      <h3>{title}</h3>
      {subtitle && <p>{subtitle}</p>}
      {action && <Link to={action.to} className="btn btn-dark">{action.label}</Link>}
    </div>
  )
}

export function EmptySearch() {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <SearchX size={30} />
      </div>
      <h3>No se encontraron productos</h3>
      <p>Prueba con otros términos de búsqueda.</p>
    </div>
  )
}
