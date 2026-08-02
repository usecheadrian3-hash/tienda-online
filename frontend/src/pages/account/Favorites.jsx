import { useEffect } from 'react'
import { Heart } from 'lucide-react'
import { useFavorites } from '../../contexts/FavoritesContext'
import ProductCard from '../../components/product/ProductCard'
import EmptyState from '../../components/ui/EmptyState'
import { SkeletonGrid } from '../../components/ui/Loaders'

export default function Favorites() {
  const { items, fetchItems, fetchIds } = useFavorites()

  useEffect(() => {
    fetchItems()
    fetchIds()
  }, [fetchItems, fetchIds])

  return (
    <div>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 20 }}>Mis favoritos</h1>
      {!items ? (
        <SkeletonGrid count={4} />
      ) : !items.length ? (
        <EmptyState
          icon={Heart}
          title="No tienes favoritos"
          subtitle="Guarda tus productos favoritos para encontrarlos rápido."
          action={{ to: '/tienda', label: 'Explorar tienda' }}
        />
      ) : (
        <div className="product-grid">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  )
}
