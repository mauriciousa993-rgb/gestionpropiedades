// Utilidades de formato en español (España).

const eur = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
})

export function formatMoney(value: number | null | undefined): string {
  if (value == null) return '—'
  return eur.format(value)
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// Devuelve el periodo "YYYY-MM" del mes actual.
export function currentPeriod(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// "2025-07" -> "Julio 2025"
export function formatPeriod(period: string | null | undefined): string {
  if (!period) return '—'
  const [y, m] = period.split('-').map(Number)
  if (!y || !m) return period
  const nombre = new Date(y, m - 1, 1).toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric',
  })
  return nombre.charAt(0).toUpperCase() + nombre.slice(1)
}

// Días que faltan (negativo si ya pasó) hasta una fecha.
export function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  const target = new Date(dateStr)
  if (Number.isNaN(target.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}
