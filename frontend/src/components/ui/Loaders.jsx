import { Loader2 } from 'lucide-react'

export function Spinner({ size = 22 }) {
  return <Loader2 size={size} className="spinner" />
}

export function FullLoader({ text = 'Cargando…' }) {
  return (
    <div className="full-loader">
      <Spinner size={32} />
      <span>{text}</span>
    </div>
  )
}

export function PageLoader({ text = 'Cargando…' }) {
  return (
    <div className="page-loader">
      <Spinner size={34} />
      <span>{text}</span>
    </div>
  )
}

export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} />
}

export function SkeletonGrid({ count = 8 }) {
  return (
    <div className="product-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div className="product-card" key={i}>
          <div className="skeleton" style={{ aspectRatio: '1 / 1', borderRadius: 16 }} />
          <div className="skeleton" style={{ height: 16, width: '80%', marginTop: 12 }} />
          <div className="skeleton" style={{ height: 14, width: '50%', marginTop: 8 }} />
          <div className="skeleton" style={{ height: 20, width: '40%', marginTop: 12 }} />
        </div>
      ))}
    </div>
  )
}
