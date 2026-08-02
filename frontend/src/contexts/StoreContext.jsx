import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import api from '../services/api'

const StoreContext = createContext(null)

export function StoreProvider({ children }) {
  const [config, setConfig] = useState(null)
  const [nav, setNav] = useState(null)
  const [loading, setLoading] = useState(true)

  const refreshConfig = useCallback(async () => {
    const res = await api.get('/api/config')
    setConfig(res.data)
    return res.data
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [cfg, nv] = await Promise.all([api.get('/api/config'), api.get('/api/nav')])
        if (cancelled) return
        setConfig(cfg.data)
        setNav(nv.data)
      } catch (e) {
        if (!cancelled) setConfig(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <StoreContext.Provider
      value={{
        config,
        nav,
        loading,
        refreshConfig,
        currency: config?.currency || 'COP',
        symbol: config?.currency_symbol || '$',
        storeName: config?.store_name || 'Tienda',
        freeShipping: config?.free_shipping_threshold || 0,
        shippingMethods: config?.shipping_methods || [],
        taxRate: config?.tax_enabled ? config?.tax_rate || 0 : 0,
        taxName: config?.tax_name || 'IVA',
      }}
    >
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore debe usarse dentro de StoreProvider')
  return ctx
}
