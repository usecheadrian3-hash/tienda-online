import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Calendar } from 'lucide-react'
import { formatDate } from '../utils/format'
import Breadcrumb from '../components/ui/Breadcrumb'
import { PageLoader } from '../components/ui/Loaders'
import EmptyState from '../components/ui/EmptyState'

export default function Blog() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const url = `/api/blog${category ? `?category=${encodeURIComponent(category)}` : ''}`
        const res = await fetch(url)
        const payload = await res.json()
        if (!cancelled) setPosts(payload.data || [])
      } catch (e) {
        if (!cancelled) setPosts([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [category])

  const categories = [...new Set(posts.map((p) => p.category).filter(Boolean))]

  return (
    <>
      <div className="page-header">
        <div className="container">
          <Breadcrumb items={[{ label: 'Blog' }]} />
          <h1>Nuestro blog</h1>
          <p>Consejos, tendencias y novedades para que compres mejor.</p>
        </div>
      </div>

      <div className="container section">
        {categories.length > 1 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 32 }}>
            <button className={`btn ${category === '' ? 'btn-dark' : 'btn-outline'} btn-sm`} onClick={() => setCategory('')}>
              Todos
            </button>
            {categories.map((c) => (
              <button
                key={c}
                className={`btn ${category === c ? 'btn-dark' : 'btn-outline'} btn-sm`}
                onClick={() => setCategory(category === c ? '' : c)}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <PageLoader />
        ) : !posts.length ? (
          <EmptyState title="Aún no hay artículos" subtitle="Vuelve pronto." />
        ) : (
          <div className="blog-grid">
            {posts.map((p) => (
              <Link to={`/blog/${p.slug}`} className="blog-card" key={p.id}>
                <div className="bc-media">
                  {p.cover_image ? (
                    <img src={p.cover_image} alt={p.title} loading="lazy" />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: 'var(--gray-100)' }} />
                  )}
                  {p.category && <span className="bc-cat">{p.category}</span>}
                </div>
                <div className="bc-body">
                  <div className="bc-meta">
                    {p.published_at && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <Calendar size={13} /> {formatDate(p.published_at)}
                      </span>
                    )}
                  </div>
                  <h3 className="bc-title">{p.title}</h3>
                  {p.excerpt && <p className="bc-excerpt">{p.excerpt}</p>}
                  <span className="section-link" style={{ marginTop: 14 }}>
                    Leer más <ArrowRight size={14} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
