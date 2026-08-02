import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation } from 'swiper/modules'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import ProductCard from './ProductCard'

import 'swiper/css'
import 'swiper/css/navigation'

export default function ProductCarousel({
  items = [],
  title = '',
  subtitle = '',
  linkTo = null,
  slidesPerView = 4,
}) {
  if (!items.length) return null

  return (
    <section className="section carousel-section">
      <div className="container">
        <div className="section-head">
          <div>
            {subtitle && <span className="section-eyebrow">{subtitle}</span>}
            <h2 className="section-title">{title}</h2>
          </div>
          {linkTo && (
            <Link to={linkTo} className="section-link">
              Ver todo <ArrowRight size={16} />
            </Link>
          )}
        </div>
        <Swiper
          modules={[Navigation]}
          navigation
          spaceBetween={20}
          slidesPerView={slidesPerView}
          breakpoints={{
            320: { slidesPerView: 1.25 },
            480: { slidesPerView: 2 },
            768: { slidesPerView: 3 },
            1024: { slidesPerView: 4 },
          }}
        >
          {items.map((p) => (
            <SwiperSlide key={p.id}>
              <div className="carousel-card">
                <ProductCard product={p} />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  )
}
