import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { SlidersHorizontal, X } from 'lucide-react'
import { useStore } from '../contexts/StoreContext'
import ProductCard from '../components/product/ProductCard'
import { SkeletonGrid } from '../components/ui/Loaders'
import EmptyState from '../components/ui/EmptyState'
import Breadcrumb from '../components/ui/Breadcrumb'

const SORT_OPTIONS = [
  { value: 'newest', label: 'Más recientes' },
  { value: 'price_asc', label: 'Precio: menor a mayor' },
  { value: 'price_desc', label: 'Precio: mayor a menor' },
  { value: 'rating', label: 'Mejor calificados' },
  { value: 'best_sold', label: 'Más vendidos' },
]

export default function Shop({ type = 'all', object = null, slug = null }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const { nav } = useStore()
  const [data, setData] = useState(null)
  const [info, setInfo] = useState(object)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const q = searchParams.get('q') || ''
  const filter = searchParams.get('filter') || ''
  const sort = searchParams.get('sort') || 'newest'
  const page = parseInt(searchParams.get('page') || '1', 10)
  const [minPrice, setMinPrice] = useState(searchParams.get('min') || '')
  const [maxPrice, setMaxPrice] = useState(searchParams.get('max') || '')
  const [filtersOpen, setFiltersOpen] = useState(false)

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (filter) params.set(filter, 'true')
    if (sort && sort !== 'newest') params.set('sort', sort)
    if (page > 1) params.set('page', page)
    if (minPrice) params.set('min_price', minPrice)
    if (maxPrice) params.set('max_price', maxPrice)
    return params.toString()
  }, [q, filter, sort, page, minPrice, maxPrice])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const currentSlug = slug ?? object?.slug
    let url
    if (type === 'category') url = `/api/categories/${currentSlug}`
    else if (type === 'brand') url = `/api/brands/${currentSlug}`
    else url = '/api/products'
    const qs = buildQuery()
    ;(async () => {
      try {
        const res = await fetch(`${url}${qs ? `?${qs}` : ''}`)
        const payload = await res.json()
        if (cancelled) return
        if (!payload.ok) {
          setError(payload.message)
        } else {
          setData(payload.data)
          const meta = payload.data?.category || payload.data?.brand
          if (meta) setInfo(meta)
        }
      } catch (e) {
        if (!cancelled) setError('Error al cargar los productos')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [type, slug, object?.slug, q, filter, sort, page, buildQuery])

  const applyPriceFilter = (e) => {
    e.preventDefault()
    const next = new URLSearchParams(searchParams)
    if (minPrice) next.set('min_price', minPrice)
    else next.delete('min_price')
    if (maxPrice) next.set('max_price', maxPrice)
    else next.delete('max_price')
    next.delete('page')
    setSearchParams(next)
  }

  const toggleFilter = (key) => {
    const next = new URLSearchParams(searchParams)
    if (next.get(key)) next.delete(key)
    else next.set(key, 'true')
    next.delete('page')
    setSearchParams(next)
  }

  const pageTitle = useMemo(() => {
    if (type === 'category') return info?.name
    if (type === 'brand') return info?.name
    if (filter === 'nuevo') return 'Novedades'
    if (filter === 'venta') return 'Ofertas'
    if (filter === 'destacado') return 'Destacados'
    return 'Tienda'
  }, [type, info, filter])

  const filters = [
    { key: 'destacado', label: 'Destacados' },
    { key: 'nuevo', label: 'Novedades' },
    { key: 'venta', label: 'En oferta' },
    { key: 'mejor_vendidos', label: 'Más vendidos' },
  ]

  return (
    <>
      <div className="page-header">
        <div className="container">
          <Breadcrumb items={[{ label: 'Inicio', to: '/' }, { label: pageTitle }]} />
          <h1>{pageTitle}</h1>
          <p>{info?.description || 'Descubre nuestra selección de productos premium.'}</p>
        </div>
      </div>

      <div className="container">
        <div className="shop-toolbar">
          <span className="result-count">
            {loading ? 'Cargando…' : `${data?.total || 0} productos`}
            {q && <> para “{q}”</>}
          </span>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              className="btn btn-outline btn-sm mobile-only"
              onClick={() => setFiltersOpen((v) => !v)}
            >
              <SlidersHorizontal size={15} /> Filtros
            </button>
            <select
              className="sort-select"
              value={sort}
              onChange={(e) => {
                const next = new URLSearchParams(searchParams)
                next.set('sort', e.target.value)
                next.delete('page')
                setSearchParams(next)
              }}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="shop-layout">
          <aside className={`filter-panel ${filtersOpen ? 'open' : ''}`}>
            <div className="filter-panel-head">
              <strong>Filtros</strong>
              <button className="btn-icon mobile-only" onClick={() => setFiltersOpen(false)}>
                <X size={18} />
              </button>
            </div>

            {type === 'all' && (
              <div className="filter-group">
                <h4>Etiquetas</h4>
                {filters.map((f) => (
                  <label key={f.key} className="filter-option">
                    <input
                      type="checkbox"
                      checked={!!searchParams.get(f.key)}
                      onChange={() => toggleFilter(f.key)}
                    />
                    {f.label}
                  </label>
                ))}
              </div>
            )}

            {type === 'all' && nav?.categories?.length > 0 && (
              <div className="filter-group">
                <h4>Categorías</h4>
                {nav.categories.map((c) => (
                  <label key={c.id} className="filter-option">
                    <input
                      type="checkbox"
                      checked={searchParams.get('category') === c.slug}
                      onChange={() => {
                        const next = new URLSearchParams(searchParams)
                        if (next.get('category') === c.slug) next.delete('category')
                        else next.set('category', c.slug)
                        next.delete('page')
                        setSearchParams(next)
                      }}
                    />
                    {c.name}
                    <span className="count">{c.product_count}</span>
                  </label>
                ))}
              </div>
            )}

            <div className="filter-group">
              <h4>Precio (COP)</h4>
              <form onSubmit={applyPriceFilter} className="filter-price-inputs">
                <input
                  type="number"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder="Mín"
                  min="0"
                />
                <input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="Máx"
                  min="0"
                />
              </form>
            </div>
          </aside>

          <div>
            {loading ? (
              <SkeletonGrid count={8} />
            ) : error ? (
              <EmptyState title="Ups, algo salió mal" subtitle={error} />
            ) : !data?.items?.length ? (
              <EmptyState
                title="No se encontraron productos"
                subtitle="Intenta con otros filtros o términos de búsqueda."
              />
            ) : (
              <>
                <div className="product-grid">
                  {data.items.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
                {data.pages > 1 && (
                  <div className="pagination">
                    {Array.from({ length: data.pages }).map((_, i) => (
                      <button
                        key={i}
                        className={i + 1 === page ? 'active' : ''}
                        onClick={() => {
                          const next = new URLSearchParams(searchParams)
                          next.set('page', i + 1)
                          setSearchParams(next)
                        }}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
