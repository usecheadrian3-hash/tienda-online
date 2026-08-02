import { useStore } from '../../contexts/StoreContext'
import { formatPrice } from '../../utils/format'

export default function Price({ value, compareAt = null, size = 'md', showDiscount = true, className = '' }) {
  const { symbol, currency } = useStore()
  const cls = `price price-${size} ${className}`.trim()

  return (
    <div className={cls}>
      {compareAt != null && Number(compareAt) > Number(value) && (
        <span className="price-was">{formatPrice(compareAt, symbol, currency)}</span>
      )}
      <span className="price-now">{formatPrice(value, symbol, currency)}</span>
      {showDiscount && compareAt != null && Number(compareAt) > Number(value) && (
        <span className="price-off">
          -{Math.round((1 - Number(value) / Number(compareAt)) * 100)}%
        </span>
      )}
    </div>
  )
}
