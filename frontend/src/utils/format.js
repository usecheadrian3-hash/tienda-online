// Utilidades de formato compartidas en la tienda

export function formatPrice(value, symbol = '$', currency = 'COP') {
  const v = Number(value) || 0
  if (currency === 'COP') {
    return `${symbol}${v.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`
  }
  return `${symbol}${v.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatDate(value, opts = {}) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...opts,
  })
}

export function formatDateTime(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function timeAgo(value) {
  if (!value) return ''
  const date = new Date(value)
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'hace un momento'
  const intervals = {
    año: 31536000,
    mes: 2592000,
    semana: 604800,
    día: 86400,
    hora: 3600,
    minuto: 60,
  }
  for (const [label, secs] of Object.entries(intervals)) {
    const count = Math.floor(seconds / secs)
    if (count >= 1) {
      return count === 1 ? `hace 1 ${label}` : `hace ${count} ${label}s`
    }
  }
  return 'hace un momento'
}

export function discountPercent(price, compareAt) {
  if (!compareAt || Number(compareAt) <= Number(price)) return 0
  return Math.round((1 - Number(price) / Number(compareAt)) * 100)
}

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}
