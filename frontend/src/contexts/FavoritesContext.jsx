import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import api from '../services/api'
import { useAuth } from './AuthContext'
import { useToast } from './ToastContext'

const FavoritesContext = createContext(null)

export function FavoritesProvider({ children }) {
  const [ids, setIds] = useState([])
  const [items, setItems] = useState([])
  const { isAuthenticated, user } = useAuth()
  const { toast } = useToast()

  const fetchIds = useCallback(async () => {
    try {
      const res = await api.get('/api/favorites/ids')
      setIds(res.data || [])
    } catch (e) {
      /* requerido login */
    }
  }, [])

  const fetchItems = useCallback(async () => {
    try {
      const res = await api.get('/api/favorites')
      setItems(res.data || [])
    } catch (e) {
      setItems([])
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      fetchIds()
      fetchItems()
    } else {
      setIds([])
      setItems([])
    }
  }, [isAuthenticated, user?.id, fetchIds, fetchItems])

  const toggle = useCallback(
    async (productId) => {
      if (!isAuthenticated) {
        toast('Inicia sesión para guardar favoritos', 'info')
        return { added: false, needsLogin: true }
      }
      const exists = ids.includes(productId)
      try {
        if (exists) {
          await api.delete(`/api/favorites/${productId}`)
          setIds((prev) => prev.filter((id) => id !== productId))
          toast('Eliminado de favoritos', 'info')
          return { added: false }
        }
        await api.post(`/api/favorites/${productId}`)
        setIds((prev) => [...prev, productId])
        toast('Agregado a favoritos', 'success')
        return { added: true }
      } catch (e) {
        toast(e.message, 'error')
        return { added: exists }
      }
    },
    [ids, isAuthenticated, toast],
  )

  const isFavorite = useCallback((productId) => ids.includes(productId), [ids])

  return (
    <FavoritesContext.Provider
      value={{ ids, items, isFavorite, toggle, fetchIds, fetchItems }}
    >
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext)
  if (!ctx) throw new Error('useFavorites debe usarse dentro de FavoritesProvider')
  return ctx
}
