import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import api, { setCartToken } from '../services/api'
import { useAuth } from './AuthContext'
import { useToast } from './ToastContext'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [cart, setCart] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const { isAuthenticated } = useAuth()
  const { toast } = useToast()
  const loaded = useRef(false)

  const fetchCart = useCallback(async () => {
    try {
      const res = await api.get('/api/cart')
      setCart(res.data)
      return res.data
    } catch (e) {
      return null
    }
  }, [])

  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    ;(async () => {
      await fetchCart()
      setLoading(false)
    })()
  }, [fetchCart])

  // Refrescar carrito cuando cambia el login (el backend asocia el carrito anónimo)
  useEffect(() => {
    if (loaded.current && isAuthenticated !== null) {
      fetchCart()
    }
  }, [isAuthenticated, fetchCart])

  const setFromResponse = useCallback((res) => {
    if (res?.data) setCart(res.data)
    return res?.data
  }, [])

  const addItem = useCallback(
    async (productId, quantity = 1, variantId = null) => {
      try {
        const res = await api.post('/api/cart/items', {
          product_id: productId,
          quantity,
          variant_id: variantId,
        })
        setFromResponse(res)
        toast('Producto agregado al carrito', 'success')
        return true
      } catch (e) {
        toast(e.message, 'error')
        return false
      }
    },
    [setFromResponse, toast],
  )

  const updateItem = useCallback(
    async (itemId, quantity) => {
      try {
        const res = await api.put(`/api/cart/items/${itemId}`, { quantity })
        setFromResponse(res)
        return true
      } catch (e) {
        toast(e.message, 'error')
        return false
      }
    },
    [setFromResponse, toast],
  )

  const removeItem = useCallback(
    async (itemId) => {
      try {
        const res = await api.delete(`/api/cart/items/${itemId}`)
        setFromResponse(res)
        return true
      } catch (e) {
        toast(e.message, 'error')
        return false
      }
    },
    [setFromResponse, toast],
  )

  const clearCart = useCallback(async () => {
    try {
      const res = await api.delete('/api/cart')
      setFromResponse(res)
      return true
    } catch (e) {
      toast(e.message, 'error')
      return false
    }
  }, [setFromResponse, toast])

  const openDrawer = useCallback(() => setDrawerOpen(true), [])
  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  return (
    <CartContext.Provider
      value={{
        cart,
        items: cart?.items || [],
        count: cart?.count || 0,
        subtotal: cart?.subtotal || 0,
        loading,
        drawerOpen,
        openDrawer,
        closeDrawer,
        addItem,
        updateItem,
        removeItem,
        clearCart,
        fetchCart,
        setFromResponse,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart debe usarse dentro de CartProvider')
  return ctx
}
