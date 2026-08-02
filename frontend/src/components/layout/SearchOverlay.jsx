import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, TrendingUp, X } from 'lucide-react'
import { useStore } from '../../contexts/StoreContext'
import { formatPrice } from '../../utils/format'

export default function SearchOverlay({ open, onClose }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState({ products: [], categories: [], brands: [] })
  const [loading, setLoading] = useState(false)
  const { symbol, currency } = useStore()
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const timer = useRef(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setResults({ products: [], categories: [], brands: [] })
      setTimeout(() => inputRef.current?.focus(), 60)
    }
  }, [open])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const doSearch = useCallback(
    async (q) => {
      if (q.trim().length < 2) {
        setResults({ products: [], categories: [], brands: [] })
        return
      }
      setLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`)
        const payload = await res.json()
        setResults(payload.data || { products: [], categories: [], brands: [] })
      } catch (e) {
        setResults({ products: [], categories: [], brands: [] })
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  const onChange = (e) => {
    const q = e.target.value
    setQuery(q)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => doSearch(q), 250)
  }

  const goTo = (path) => {
    onClose()
    navigate(path)
  }

  const submit = (e) => {
    e.preventDefault()
    if (!query.trim()) return
    onClose()
    navigate(`/tienda?q=${encodeURIComponent(query.trim())}`)
  }

  if (!open) return null

  const hasResults = results.products.length + results.categories.length + results.brands.length > 0

  return (
    <div className="search-overlay" onClick={onClose}>
      <div className="search-panel" onClick={(e) => e.stopPropagation()}>
        <form className="search-input-row" onSubmit={submit}>
          <Search size={22} />
          <input
            ref={inputRef}
            value={query}
            onChange={onChange}
            placeholder="Buscar productos, categorías, marcas…"
          />
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </form>
        <div className="search-results">
          {loading && (
            <div className="search-group-title" style={{ textAlign: 'center', padding: 24 }}>
              Buscando…
            </div>
          )}
          {!loading && !hasResults && query.trim().length >= 2 && (
            <div className="search-group-title" style={{ textAlign: 'center', padding: 24 }}>
              Sin resultados para “{query}”
            </div>
          )}
          {!loading && results.categories.length > 0 && (
            <>
              <div className="search-group-title">Categorías</div>
              {results.categories.map((c) => (
                <button key={c.id} className="search-result-item" onClick={() => goTo(`/categoria/${c.slug}`)}>
                  <TrendingUp size={18} />
                  <span className="res-name">{c.name}</span>
                </button>
              ))}
            </>
          )}
          {!loading && results.products.length > 0 && (
            <>
              <div className="search-group-title">Productos</div>
              {results.products.map((p) => (
                <button key={p.id} className="search-result-item" onClick={() => goTo(`/producto/${p.slug}`)}>
                  {p.primary_image && <img src={p.primary_image} alt={p.name} />}
                  <span>
                    <span className="res-name">{p.name}</span>
                    <span className="res-meta">{p.category?.name}</span>
                  </span>
                  <span className="res-price">{formatPrice(p.price, symbol, currency)}</span>
                </button>
              ))}
            </>
          )}
          {!loading && results.brands.length > 0 && (
            <>
              <div className="search-group-title">Marcas</div>
              {results.brands.map((b) => (
                <button key={b.id} className="search-result-item" onClick={() => goTo(`/marca/${b.slug}`)}>
                  <span className="res-name">{b.name}</span>
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
