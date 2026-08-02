import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Calendar } from 'lucide-react'
import { formatDate } from '../utils/format'
import Breadcrumb from '../components/ui/Breadcrumb'
import { PageLoader } from '../components/ui/Loaders'
import EmptyState from '../components/ui/EmptyState'

export default function BlogPost() {
  const { slug } = useParams()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setNotFound(false)
    ;(async () => {
      try {
        const res = await fetch(`/api/blog/${slug}`)
        const payload = await res.json()
        if (cancelled) return
        if (!payload.ok) setNotFound(true)
        else setPost(payload.data)
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

  if (loading) return <PageLoader />
  if (notFound || !post) {
    return (
      <div className="container">
        <EmptyState
          title="Artículo no encontrado"
          subtitle="El artículo que buscas no existe."
          action={{ to: '/blog', label: 'Volver al blog' }}
        />
      </div>
    )
  }

  return (
    <div className="container">
      <Breadcrumb items={[{ label: 'Blog', to: '/blog' }, { label: post.title }]} />
      <article className="blog-post-body">
        <span className="section-eyebrow">{post.category || 'Blog'}</span>
        <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, marginTop: 8 }}>
          {post.title}
        </h1>
        <div className="bc-meta" style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 12 }}>
          {post.author && <span style={{ fontWeight: 600 }}>Por {post.author}</span>}
          {post.published_at && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Calendar size={14} /> {formatDate(post.published_at)}
            </span>
          )}
        </div>
        {post.cover_image && (
          <div className="bp-hero">
            <img src={post.cover_image} alt={post.title} />
          </div>
        )}
        <div className="bp-content" style={{ whiteSpace: 'pre-wrap' }}>
          {post.content}
        </div>
        <Link to="/blog" className="btn btn-outline" style={{ marginTop: 40 }}>
          <ArrowLeft size={16} /> Volver al blog
        </Link>
      </article>
    </div>
  )
}
