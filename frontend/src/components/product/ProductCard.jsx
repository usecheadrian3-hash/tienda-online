import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, Heart, ShoppingBag, Check } from 'lucide-react'
import { useCart } from '../../contexts/CartContext'
import { useFavorites } from '../../contexts/FavoritesContext'
import { useStore } from '../../contexts/StoreContext'
import { formatPrice } from '../../utils/format'
import Rating from '../ui/Rating'

export default function ProductCard({ product, layout = 'grid' }) {
  const { addItem } = useCart()
  const { isFavorite, toggle } = useFavorites()
  const { symbol, currency } = useStore()
  const navigate = useNavigate()
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const wished = isFavorite(product.id)

  const handleAdd = async (e) => {
    e.preventDefault()
    if (product.has_variants && product.variants?.length) {
      navigate(`/producto/${product.slug}`)
      return
    }
    setAdding(true)
    const ok = await addItem(product.id, 1, null)
    setAdding(false)
    if (ok) {
      setAdded(true)
      setTimeout(() => setAdded(false), 1600)
    }
  }

  const handleWish = async (e) => {
    e.preventDefault()
    await toggle(product.id)
  }

  return (
    <article className={`product-card pc-${layout}`}>
      <div className="pc-media" onClick={() => navigate(`/producto/${product.slug}`)}>
        <div className="pc-badges">
          {product.discount_percent > 0 && (
            <span className="badge badge-accent">-{product.discount_percent}%</span>
          )}
          {product.is_new && <span className="badge badge-dark">Nuevo</span>}
          {product.stock_status === 'agotado' && (
            <span className="badge badge-dark">Agotado</span>
          )}
        </div>
        <button
          className={`pc-wish ${wished ? 'wished' : ''}`}
          onClick={handleWish}
          aria-label="Guardar en favoritos"
        >
          <Heart size={18} fill={wished ? 'currentColor' : 'none'} />
        </button>
        {product.primary_image ? (
          <img src={product.primary_image} alt={product.name} loading="lazy" />
        ) : (
          <div className="pc-media-placeholder" />
        )}
        {product.stock_status !== 'agotado' && (
          <button className="pc-quick" onClick={handleAdd}>
            {added ? <Check size={16} /> : <ShoppingBag size={16} />}
            {added ? 'Agregado' : 'Agregar al carrito'}
          </button>
        )}
      </div>

      <div className="pc-body">
        {product.brand && <span className="pc-brand">{product.brand.name}</span>}
        <h3 className="pc-name">
          <Link to={`/producto/${product.slug}`}>{product.name}</Link>
        </h3>
        {product.rating_count > 0 && (
          <div className="pc-rating">
            <Rating value={product.rating_avg} showValue />
          </div>
        )}
        <div className="pc-price">
          <span className="now">{formatPrice(product.price, symbol, currency)}</span>
          {product.compare_at_price > product.price && (
            <>
              <span className="was">
                {formatPrice(product.compare_at_price, symbol, currency)}
              </span>
            </>
          )}
        </div>
        <div className="pc-actions">
          {product.stock_status === 'agotado' ? (
            <Link to={`/producto/${product.slug}`} className="btn btn-outline">
              <Eye size={16} /> Ver
            </Link>
          ) : (
            <button className={`btn btn-dark ${added ? 'added' : ''}`} onClick={handleAdd}>
              {adding ? '…' : added ? <Check size={16} /> : <ShoppingBag size={16} />}
              {added ? 'Agregado' : 'Agregar'}
            </button>
          )}
          <Link
            to={`/producto/${product.slug}`}
            className="btn btn-outline"
            aria-label="Ver detalle"
          >
            <Eye size={16} />
          </Link>
        </div>
      </div>
    </article>
  )
}
