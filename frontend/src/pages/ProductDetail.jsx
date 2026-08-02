import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Check, ChevronRight, Heart, Minus, Plus, RefreshCcw, RotateCcw,
  ShieldCheck, ShoppingBag, Truck, Zap,
} from 'lucide-react'
import { useStore } from '../contexts/StoreContext'
import { useCart } from '../contexts/CartContext'
import { useFavorites } from '../contexts/FavoritesContext'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { formatPrice } from '../utils/format'
import Rating from '../components/ui/Rating'
import Breadcrumb from '../components/ui/Breadcrumb'
import ProductCarousel from '../components/product/ProductCarousel'
import { PageLoader } from '../components/ui/Loaders'
import EmptyState from '../components/ui/EmptyState'

export default function ProductDetail() {
  const { slug } = useParams()
  const { symbol, currency } = useStore()
  const { addItem } = useCart()
  const { isFavorite, toggle } = useFavorites()
  const { user } = useAuth()
  const { toast } = useToast()

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [activeImage, setActiveImage] = useState(0)
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [tab, setTab] = useState('descripcion')
  const [adding, setAdding] = useState(false)
  const [review, setReview] = useState({ rating: 5, title: '', comment: '' })
  const [reviewSending, setReviewSending] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setNotFound(false)
    ;(async () => {
      try {
        const res = await fetch(`/api/products/${slug}`)
        const payload = await res.json()
        if (cancelled) return
        if (!payload.ok) {
          setNotFound(true)
        } else {
          setProduct(payload.data)
          setActiveImage(0)
          setSelectedVariant(null)
          setQuantity(1)
        }
      } catch (e) {
        if (!cancelled) setNotFound(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [slug])

  const images = useMemo(
    () =>
      product?.images?.length
        ? product.images
        : product?.primary_image
          ? [{ url: product.primary_image }]
          : [],
    [product],
  )

  if (loading) return <PageLoader />
  if (notFound || !product) {
    return (
      <div className="container">
        <EmptyState
          title="Producto no encontrado"
          subtitle="El producto que buscas ya no está disponible."
          action={{ to: '/tienda', label: 'Ir a la tienda' }}
        />
      </div>
    )
  }

  const wished = isFavorite(product.id)
  const activePrice = selectedVariant?.price ?? product.price
  const activeCompare = selectedVariant?.compare_at_price ?? product.compare_at_price
  const activeStock = selectedVariant?.stock ?? product.stock
  const outOfStock = activeStock <= 0
  const colorOptions = product.variant_options?.colors || []
  const sizeOptions = product.variant_options?.sizes || []
  const selectedColor = selectedVariant?.color || ''
  const selectedSize = selectedVariant?.size || ''

  const pickVariant = (color, size) => {
    if (!product.variants?.length) return
    const match = product.variants.find(
      (v) => (!color || v.color === color) && (!size || v.size === size),
    )
    setSelectedVariant(match || null)
  }

  const handleAdd = async () => {
    setAdding(true)
    const ok = await addItem(product.id, quantity, selectedVariant?.id ?? null)
    setAdding(false)
    if (ok) setQuantity(1)
  }

  const handleWish = async () => {
    if (!user) {
      toast('Inicia sesión para guardar favoritos', 'info')
      return
    }
    await toggle(product.id)
  }

  const submitReview = async (e) => {
    e.preventDefault()
    setReviewSending(true)
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('tienda_token')}` },
        body: JSON.stringify({ product_id: product.id, ...review }),
      })
      const payload = await res.json()
      if (payload.ok) {
        toast(payload.message, 'success')
        setReview({ rating: 5, title: '', comment: '' })
      } else {
        toast(payload.message, 'error')
      }
    } catch (err) {
      toast('Error al enviar la reseña', 'error')
    } finally {
      setReviewSending(false)
    }
  }

  return (
    <>
      <div className="container">
        <Breadcrumb
          items={[
            { label: 'Tienda', to: '/tienda' },
            { label: product.category?.name || 'Producto', to: product.category ? `/categoria/${product.category.slug}` : '/tienda' },
            { label: product.name },
          ]}
        />
      </div>

      <div className="container">
        <div className="pd-layout">
          {/* Galería */}
          <div className="pd-gallery">
            <div className="pd-thumbs">
              {images.map((img, i) => (
                <button
                  key={i}
                  className={`pd-thumb ${i === activeImage ? 'active' : ''}`}
                  onClick={() => setActiveImage(i)}
                >
                  <img src={img.url} alt={product.name} />
                </button>
              ))}
            </div>
            <div className="pd-main">
              <div className="pc-badges">
                {product.discount_percent > 0 && (
                  <span className="badge badge-sale">-{product.discount_percent}%</span>
                )}
                {product.stock_status === 'agotado' && <span className="badge badge-new">Agotado</span>}
              </div>
              {images[activeImage] ? (
                <img src={images[activeImage].url} alt={product.name} />
              ) : (
                <div style={{ width: '100%', height: '100%', background: 'var(--gray-100)' }} />
              )}
            </div>
          </div>

          {/* Info */}
          <div className="pd-info">
            {product.brand && <div className="pd-brand-line">Marca: <strong>{product.brand.name}</strong></div>}
            <h1>{product.name}</h1>
            <div className="pd-rating">
              <Rating value={product.rating_avg} size={17} showValue />
              <span style={{ color: 'var(--gray-500)', fontSize: '.86rem' }}>
                {product.rating_count > 0
                  ? `(${product.rating_count} reseñas)`
                  : 'Sin reseñas'}
              </span>
              <a href="#reseñas">Deja tu opinión</a>
            </div>
            <div className="pd-price">
              <span className="now">{formatPrice(activePrice, symbol, currency)}</span>
              {activeCompare > activePrice && (
                <>
                  <span className="was">{formatPrice(activeCompare, symbol, currency)}</span>
                  <span className="off">
                    -{Math.round((1 - activePrice / activeCompare) * 100)}%
                  </span>
                </>
              )}
            </div>
            <div className="pd-sku">SKU: {selectedVariant?.sku || product.sku}</div>
            {product.short_description && <p className="pd-short">{product.short_description}</p>}

            {colorOptions.length > 0 && (
              <div className="variant-group">
                <label>Color: <small>{selectedColor || 'Selecciona'}</small></label>
                <div className="var-chips">
                  {colorOptions.map((c) => (
                    <button
                      key={c}
                      className={`var-chip ${selectedColor === c ? 'active' : ''}`}
                      onClick={() => pickVariant(c, selectedSize)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {sizeOptions.length > 0 && (
              <div className="variant-group">
                <label>Talla: <small>{selectedSize || 'Selecciona'}</small></label>
                <div className="var-chips">
                  {sizeOptions.map((s) => {
                    const hasStock = product.variants.some(
                      (v) => v.size === s && (!selectedColor || v.color === selectedColor) && v.stock > 0,
                    )
                    return (
                      <button
                        key={s}
                        className={`var-chip size-chip ${selectedSize === s ? 'active' : ''}`}
                        disabled={!hasStock}
                        onClick={() => pickVariant(selectedColor, s)}
                      >
                        {s}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="pd-actions">
              <div className="pd-qty">
                <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Restar">
                  <Minus size={16} />
                </button>
                <span>{quantity}</span>
                <button onClick={() => setQuantity((q) => q + 1)} aria-label="Sumar">
                  <Plus size={16} />
                </button>
              </div>
              <button
                className="btn btn-primary"
                disabled={outOfStock || adding}
                onClick={handleAdd}
              >
                <ShoppingBag size={18} />
                {outOfStock ? 'Agotado' : adding ? 'Agregando…' : 'Agregar al carrito'}
              </button>
              <button
                className={`pd-wish-btn ${wished ? 'wished' : ''}`}
                onClick={handleWish}
                aria-label="Favoritos"
              >
                <Heart size={20} fill={wished ? 'currentColor' : 'none'} />
              </button>
            </div>

            <div className="pd-perks">
              <div className="pd-perk"><Truck size={18} /> Envío 24/48h</div>
              <div className="pd-perk"><ShieldCheck size={18} /> Compra segura</div>
              <div className="pd-perk"><RotateCcw size={18} /> Devolución 30 días</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="pd-tabs">
          <div className="pd-tabs-nav">
            {[
              ['descripcion', 'Descripción'],
              ['caracteristicas', 'Características'],
              ['reseñas', `Reseñas (${product.rating_count})`],
            ].map(([key, label]) => (
              <button
                key={key}
                className={`pd-tab ${tab === key ? 'active' : ''}`}
                onClick={() => setTab(key)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="pd-tab-panel">
            {tab === 'descripcion' && (
              <div style={{ maxWidth: 760, color: 'var(--gray-700)', lineHeight: 1.85, whiteSpace: 'pre-wrap' }}>
                {product.description || product.short_description || 'Sin descripción disponible.'}
              </div>
            )}
            {tab === 'caracteristicas' && (
              <ul className="pd-features">
                {(product.features || []).map((f, i) => (
                  <li key={i}>
                    <Check size={16} /> {f}
                  </li>
                ))}
              </ul>
            )}
            {tab === 'reseñas' && (
              <div id="reseñas">
                {product.reviews?.length ? (
                  <div className="review-list">
                    {product.reviews.map((r) => (
                      <div className="review-item" key={r.id}>
                        <div className="rv-head">
                          <div className="rv-avatar">{r.user?.name?.[0] || 'U'}</div>
                          <div>
                            <div className="rv-name">{r.user?.name || 'Cliente'}</div>
                            <Rating value={r.rating} size={12} />
                          </div>
                        </div>
                        {r.title && <div className="rv-title">{r.title}</div>}
                        {r.comment && <div className="rv-comment">{r.comment}</div>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--gray-500)' }}>Aún no hay reseñas para este producto.</p>
                )}

                {user ? (
                  <form className="review-form" onSubmit={submitReview}>
                    <h3>Escribe una reseña</h3>
                    <div className="field">
                      <label>Calificación</label>
                      <div className="rate-select">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            type="button"
                            key={n}
                            className={n <= review.rating ? 'on' : ''}
                            onClick={() => setReview((r) => ({ ...r, rating: n }))}
                            aria-label={`${n} estrellas`}
                          >
                            <StarIcon />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="field">
                      <input
                        value={review.title}
                        onChange={(e) => setReview((r) => ({ ...r, title: e.target.value }))}
                        placeholder="Título (opcional)"
                      />
                    </div>
                    <div className="field">
                      <textarea
                        rows={4}
                        value={review.comment}
                        onChange={(e) => setReview((r) => ({ ...r, comment: e.target.value }))}
                        placeholder="Cuéntanos tu experiencia…"
                      />
                    </div>
                    <button className="btn btn-dark" disabled={reviewSending}>
                      {reviewSending ? 'Enviando…' : 'Publicar reseña'}
                    </button>
                  </form>
                ) : (
                  <p style={{ color: 'var(--gray-500)', marginTop: 20 }}>
                    <Link to="/login" style={{ color: 'var(--accent-600)', fontWeight: 600 }}>
                      Inicia sesión
                    </Link>{' '}
                    para dejar tu reseña.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {product.related?.length > 0 && (
        <ProductCarousel title="Productos relacionados" subtitle="Quizás también te gusten" items={product.related} />
      )}
    </>
  )
}

function StarIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.2l7.1-.6z" />
    </svg>
  )
}
