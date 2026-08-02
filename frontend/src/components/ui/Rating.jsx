import { Star, StarHalf } from 'lucide-react'

export default function Rating({ value = 0, size = 14, showValue = false, count = null }) {
  const clamped = Math.max(0, Math.min(5, Number(value) || 0))
  const full = Math.floor(clamped)
  const half = clamped - full >= 0.5
  const stars = []
  for (let i = 0; i < full; i += 1) stars.push('full')
  if (half) stars.push('half')
  while (stars.length < 5) stars.push('empty')

  return (
    <span className="rating" aria-label={`${clamped} de 5 estrellas`}>
      {stars.map((s, i) =>
        s === 'full' ? (
          <Star key={i} size={size} fill="currentColor" strokeWidth={0} />
        ) : s === 'half' ? (
          <span key={i} className="rating-half">
            <Star size={size} fill="currentColor" strokeWidth={0} className="rating-half-bg" />
            <StarHalf size={size} fill="currentColor" strokeWidth={0} />
          </span>
        ) : (
          <Star key={i} size={size} className="rating-empty" />
        ),
      )}
      {showValue && <strong>{clamped.toLocaleString('es-CO')}</strong>}
      {count != null && <small>({count})</small>}
    </span>
  )
}
