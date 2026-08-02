import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, BadgePercent, Sparkles, Star, Truck, ShieldCheck, RefreshCw } from 'lucide-react'
import { useStore } from '../contexts/StoreContext'
import { formatPrice } from '../utils/format'
import { TrustBar } from '../components/layout/Topbar'
import ProductCarousel from '../components/product/ProductCarousel'
import ProductCard from '../components/product/ProductCard'
import Reveal from '../components/ui/Reveal'
import { SkeletonGrid } from '../components/ui/Loaders'
import { useCart } from '../contexts/CartContext'
import { useToast } from '../contexts/ToastContext'

export default function Home() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const { symbol, currency } = useStore()
  const { addItem } = useCart()
  const { toast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/home')
        const payload = await res.json()
        if (!cancelled) setData(payload.data)
      } catch (e) {
        toast('No se pudieron cargar los productos', 'error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [toast])

  if (loading) {
    return (
      <div className="container" style={{ padding: 'var(--space-8) 0' }}>
        <SkeletonGrid count={8} />
      </div>
    )
  }

  const hero = data?.hero
  const heroProduct = hero?.main_product
  const promo = data?.promotions?.[0]
  const promo2 = data?.promotions?.[1]
  const categories = data?.categories || []
  const brands = data?.brands || []
  const sections = data?.sections || {}

  const handleHeroAdd = async (e) => {
    e.preventDefault()
    if (!heroProduct) return
    const ok = await addItem(heroProduct.id, 1, null)
    if (ok) navigate('/carrito')
  }

  return (
    <>
      {/* HERO */}
      <section className="hero">
        <div className="hero-bg" />
        <div className="container">
          <div className="hero-grid">
            <div>
              <Reveal>
                <span className="hero-eyebrow">
                  <Sparkles size={14} /> {hero?.banner?.text || 'Nueva colección 2026'}
                </span>
              </Reveal>
              <Reveal delay={0.08}>
                <h1 className="hero-title">
                  {hero?.title?.split(' ').slice(0, -1).join(' ')}{' '}
                  <span className="accent-word">{hero?.title?.split(' ').pop()}</span>
                </h1>
              </Reveal>
              <Reveal delay={0.16}>
                <p className="hero-sub">{hero?.subtitle}</p>
              </Reveal>
              <Reveal delay={0.24}>
                <div className="hero-actions">
                  <Link to="/tienda" className="btn btn-primary btn-lg">
                    Comprar ahora <ArrowRight size={18} />
                  </Link>
                  {heroProduct && (
                    <Link to={`/producto/${heroProduct.slug}`} className="btn btn-outline btn-lg">
                      Ver destacado
                    </Link>
                  )}
                </div>
              </Reveal>
              <Reveal delay={0.32}>
                <div className="hero-stats">
                  <div className="hero-stat">
                    <strong>+1.200</strong>
                    <span>Productos</span>
                  </div>
                  <div className="hero-stat">
                    <strong>98%</strong>
                    <span>Clientes felices</span>
                  </div>
                  <div className="hero-stat">
                    <strong>24h</strong>
                    <span>Envíos</span>
                  </div>
                </div>
              </Reveal>
            </div>

            <Reveal delay={0.2} className="hero-visual">
              <div className="hero-img-frame">
                {hero?.main_image ? (
                  <img src={hero.main_image} alt={heroProduct?.name} />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: 'var(--gray-100)' }} />
                )}
                {heroProduct && (
                  <div className="hero-img-tag">
                    <div className="tag-label">{heroProduct.brand?.name}</div>
                    <div className="tag-title">{heroProduct.name}</div>
                  </div>
                )}
              </div>
              {hero?.floating?.slice(0, 4).map((p, i) => (
                <Link
                  key={p.id}
                  to={`/producto/${p.slug}`}
                  className={`hero-float hero-float-${i + 1}`}
                  style={{ animationDelay: `${0.4 + i * 0.5}s` }}
                >
                  {p.primary_image && <img src={p.primary_image} alt={p.name} />}
                  <div>
                    <div className="hf-name">{p.name}</div>
                    <div className="hf-price">{formatPrice(p.price, symbol, currency)}</div>
                  </div>
                  <span className="hf-buy" onClick={handleHeroAdd}>
                    <ArrowRight size={15} />
                  </span>
                </Link>
              ))}
            </Reveal>
          </div>
        </div>
      </section>

      <TrustBar />

      {/* CATEGORÍAS */}
      {categories.length > 0 && (
        <section className="section">
          <div className="container">
            <Reveal>
              <div className="section-head">
                <div>
                  <span className="section-eyebrow">Explora</span>
                  <h2 className="section-title">Compra por categoría</h2>
                </div>
                <Link to="/tienda" className="section-link">
                  Ver todo <ArrowRight size={16} />
                </Link>
              </div>
            </Reveal>
            <div className="cat-grid">
              {categories.map((c, i) => (
                <Reveal key={c.id} delay={i * 0.06}>
                  <Link to={`/categoria/${c.slug}`} className="cat-card">
                    {c.image ? (
                      <img src={c.image} alt={c.name} loading="lazy" />
                    ) : (
                      <div style={{ position: 'absolute', inset: 0, background: 'var(--gray-100)' }} />
                    )}
                    <div className="cat-info">
                      <div>
                        <div className="cat-name">{c.name}</div>
                        <div className="cat-count">{c.product_count} productos</div>
                      </div>
                      <span className="cat-arrow">
                        <ArrowRight size={17} />
                      </span>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* DESTACADOS */}
      {sections.featured?.items?.length > 0 && (
        <ProductCarousel
          title="Destacados"
          subtitle="Los más queridos"
          items={sections.featured.items}
          linkTo="/tienda?filter=destacado"
        />
      )}

      {/* PROMO BANNER */}
      {promo && (
        <section className="section-sm">
          <div className="container">
            <Reveal>
              <div className="promo-grid">
                <Link to={promo.link || '/tienda'} className="promo-card">
                  {promo.image && <img src={promo.image} alt={promo.title} />}
                  <div className="promo-body">
                    {promo.badge && <span className="promo-badge">{promo.badge}</span>}
                    <h3>{promo.title}</h3>
                    <p>{promo.subtitle}</p>
                    <span className="btn btn-light btn-sm">
                      Descubrir <ArrowRight size={15} />
                    </span>
                  </div>
                </Link>
                <Link to={promo2?.link || '/tienda'} className="promo-card accent">
                  <div className="promo-body">
                    <span className="promo-badge">{promo2?.badge || 'Oferta'}</span>
                    <div className="promo-discount-big">-{promo2?.discount_percent || '30'}%</div>
                    <h3>{promo2?.title || 'Descuentos exclusivos'}</h3>
                    <p>{promo2?.subtitle}</p>
                    <span className="btn btn-dark btn-sm">
                      Aprovechar <ArrowRight size={15} />
                    </span>
                  </div>
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* NOVEDADES */}
      {sections.new_arrivals?.items?.length > 0 && (
        <ProductCarousel
          title="Novedades"
          subtitle="Recién llegado"
          items={sections.new_arrivals.items}
          linkTo="/tienda?filter=nuevo"
        />
      )}

      {/* MARCAS */}
      {brands.length > 0 && (
        <section className="section section-off">
          <div className="container">
            <Reveal>
              <div className="section-head">
                <div>
                  <span className="section-eyebrow">Nuestras marcas</span>
                  <h2 className="section-title">Las mejores marcas</h2>
                </div>
              </div>
            </Reveal>
            <div className="brand-row">
              {brands.map((b, i) => (
                <Reveal key={b.id} delay={i * 0.05}>
                  <Link to={`/marca/${b.slug}`} className="brand-logo">
                    {b.logo ? (
                      <img src={b.logo} alt={b.name} loading="lazy" />
                    ) : (
                      <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'var(--gray-100)', display: 'grid', placeItems: 'center' }}>
                        <BadgePercent size={22} style={{ color: 'var(--accent)' }} />
                      </div>
                    )}
                    <span>{b.name}</span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* MEJORES VENDIDOS */}
      {sections.best_sellers?.items?.length > 0 && (
        <ProductCarousel
          title="Más vendidos"
          subtitle="Top ventas"
          items={sections.best_sellers.items}
          linkTo="/tienda?filter=ventas"
        />
      )}

      {/* OFERTAS */}
      {sections.sales?.items?.length > 0 && (
        <section className="section section-dark">
          <div className="container">
            <Reveal>
              <div className="section-head">
                <div>
                  <span className="section-eyebrow" style={{ color: 'var(--accent)' }}>Ofertas limitadas</span>
                  <h2 className="section-title" style={{ color: '#fff' }}>No te lo pierdas</h2>
                </div>
                <Link to="/tienda?filter=venta" className="section-link" style={{ color: '#fff', borderColor: 'var(--accent)' }}>
                  Ver ofertas <ArrowRight size={16} />
                </Link>
              </div>
            </Reveal>
            <div className="product-grid">
              {sections.sales.items.slice(0, 4).map((p, i) => (
                <Reveal key={p.id} delay={i * 0.07}>
                  <ProductCard product={p} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* RECOMENDADOS */}
      {sections.recommended?.items?.length > 0 && (
        <ProductCarousel
          title="Recomendados para ti"
          subtitle="Basados en calificaciones"
          items={sections.recommended.items}
        />
      )}

      {/* CTA INTERMEDIO */}
      <section className="section-sm">
        <div className="container">
          <Reveal>
            <div className="mid-cta">
              <div className="cta-body">
                <span className="section-eyebrow" style={{ color: 'var(--accent)' }}>Experiencia premium</span>
                <h2>Compra con confianza y recibe en tu puerta</h2>
                <p>
                  Procesamos tus pagos de forma segura con PSE, tarjetas y billeteras digitales.
                  Envío rápido a toda Colombia con seguimiento en tiempo real.
                </p>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <Link to="/tienda" className="btn btn-primary">Explorar tienda</Link>
                  <Link to="/blog" className="btn btn-white-outline">Leer blog</Link>
                </div>
              </div>
              <div className="cta-media">
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 30% 40%, rgba(255,90,60,.4), transparent 70%)' }} />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* TESTIMONIOS */}
      <section className="section">
        <div className="container">
          <Reveal>
            <div className="section-head text-center" style={{ justifyContent: 'center' }}>
              <div>
                <span className="section-eyebrow">Testimonios</span>
                <h2 className="section-title">Lo que dicen nuestros clientes</h2>
              </div>
            </div>
          </Reveal>
          <div className="grid grid-3" style={{ gap: 'var(--space-5)' }}>
            {[
              { name: 'María F.', role: 'Medellín', text: 'Excelente servicio, llegó antes de lo esperado y la calidad es increíble. 100% recomendado.' },
              { name: 'Carlos R.', role: 'Bogotá', text: 'El pago con PSE fue muy fácil y seguro. El seguimiento del pedido me dio mucha tranquilidad.' },
              { name: 'Daniela S.', role: 'Cali', text: 'Compré dos veces y todo perfecto. La atención al cliente respondió al instante. Volveré a comprar.' },
            ].map((t, i) => (
              <Reveal key={t.name} delay={i * 0.08}>
                <div className="quote-card">
                  <div className="stars">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} size={15} fill="currentColor" strokeWidth={0} />
                    ))}
                  </div>
                  <p>“{t.text}”</p>
                  <div className="q-author">
                    <div className="q-avatar">{t.name[0]}</div>
                    <div>
                      <strong style={{ fontSize: '.92rem' }}>{t.name}</strong>
                      <div style={{ fontSize: '.8rem', color: 'var(--gray-500)' }}>{t.role}</div>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
