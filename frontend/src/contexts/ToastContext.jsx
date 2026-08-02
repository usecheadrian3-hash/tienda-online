import { createContext, useCallback, useContext, useRef, useState } from 'react'

const ToastContext = createContext(null)

let toastId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    clearTimeout(timers.current[id])
    delete timers.current[id]
  }, [])

  const push = useCallback((message, type = 'info') => {
    const id = ++toastId
    setToasts((prev) => [...prev.slice(-3), { id, message, type }])
    timers.current[id] = setTimeout(() => dismiss(id), 4000)
  }, [dismiss])

  const toast = useCallback((message, type = 'info') => push(message, type), [push])
  const success = useCallback((m) => push(m, 'success'), [push])
  const error = useCallback((m) => push(m, 'error'), [push])
  const info = useCallback((m) => push(m, 'info'), [push])

  return (
    <ToastContext.Provider value={{ toast, success, error, info, dismiss }}>
      {children}
      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`} onClick={() => dismiss(t.id)}>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider')
  return ctx
}
