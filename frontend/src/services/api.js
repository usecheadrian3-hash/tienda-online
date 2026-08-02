// Cliente HTTP centralizado hacia el backend Flask
const TOKEN_KEY = 'tienda_token'
const CART_TOKEN_KEY = 'tienda_cart_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export function getCartToken() {
  return localStorage.getItem(CART_TOKEN_KEY)
}

export function setCartToken(token) {
  if (token) localStorage.setItem(CART_TOKEN_KEY, token)
  else localStorage.removeItem(CART_TOKEN_KEY)
}

class ApiError extends Error {
  constructor(message, status, errors) {
    super(message)
    this.status = status
    this.errors = errors || {}
  }
}

async function request(path, { method = 'GET', body, headers = {}, formData, isBlob = false } = {}) {
  const h = { ...headers }
  const token = getToken()
  if (token) h.Authorization = `Bearer ${token}`
  const cartToken = getCartToken()
  if (cartToken) h['X-Cart-Token'] = cartToken

  const opts = { method, headers: h }
  if (formData) {
    opts.body = formData
  } else if (body !== undefined) {
    h['Content-Type'] = 'application/json'
    opts.body = JSON.stringify(body)
  }

  let res
  try {
    res = await fetch(path, opts)
  } catch (e) {
    throw new ApiError('No se pudo conectar con el servidor', 0)
  }

  if (isBlob) {
    if (!res.ok) {
      let message = 'Error de descarga'
      try {
        const json = await res.json()
        message = json.message || message
      } catch (e) {
        /* noop */
      }
      throw new ApiError(message, res.status)
    }
    return res.blob()
  }

  let payload = null
  try {
    payload = await res.json()
  } catch (e) {
    /* respuesta no JSON */
  }

  if (!res.ok) {
    throw new ApiError(
      payload?.message || `Error ${res.status}`,
      res.status,
      payload?.errors || {},
    )
  }

  // Guardar token del carrito si el servidor lo genera
  if (payload?.data && typeof payload.data === 'object' && payload.data.token) {
    setCartToken(payload.data.token)
  }

  return payload
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  delete: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
  upload: (path, file, opts) => {
    const formData = new FormData()
    formData.append('file', file)
    return request(path, { ...opts, method: 'POST', formData })
  },
}

export default api
export { ApiError }
