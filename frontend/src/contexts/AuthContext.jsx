import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import api, { getToken, setToken } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchMe = useCallback(async () => {
    if (!getToken()) return null
    try {
      const res = await api.get('/api/me')
      setUser(res.data)
      return res.data
    } catch (e) {
      setToken(null)
      setUser(null)
      return null
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      await fetchMe()
      setLoading(false)
    })()
  }, [fetchMe])

  const login = useCallback(async (email, password) => {
    const res = await api.post('/api/login', { email, password })
    setToken(res.data.token)
    setUser(res.data.user)
    return res.data.user
  }, [])

  const register = useCallback(async (payload) => {
    const res = await api.post('/api/register', payload)
    setToken(res.data.token)
    setUser(res.data.user)
    return res.data.user
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  const updateUser = useCallback((data) => {
    setUser(data)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        isAdmin: !!user?.is_admin,
        login,
        register,
        logout,
        fetchMe,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
