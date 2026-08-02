import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="container">
      <div className="status-page">
        <div className="status-icon warning">
          <Compass />
        </div>
        <h1>404 — Página no encontrada</h1>
        <p>La página que buscas no existe o fue movida.</p>
        <div className="status-actions">
          <Link to="/" className="btn btn-primary">Ir al inicio</Link>
          <Link to="/tienda" className="btn btn-outline">Ir a la tienda</Link>
        </div>
      </div>
    </div>
  )
}
